"""회의방 참가자 관리 테스트.

LiveKit도 Deepgram도 없이 돈다. 참가자 정보를 읽는 규칙과 들어오고 나갈 때의
정리를 고정한다.
"""

import re
from pathlib import Path

import pytest

from translation_pipeline.agent import (
    COUNTRY_ATTRIBUTE,
    LANGUAGE_ATTRIBUTE,
    LANGUAGE_BY_COUNTRY,
    ParticipantInfo,
    TranslationAgent,
    read_participant,
)

ROOM = "lab-likelion-20260817-meeting-room"

SHARED_MEETING_CONTRACT = (
    Path(__file__).resolve().parents[3]
    / "packages"
    / "shared"
    / "src"
    / "contracts"
    / "http"
    / "meeting.ts"
)

SERVER_MEETING_SERVICE = (
    Path(__file__).resolve().parents[2]
    / "server"
    / "src"
    / "modules"
    / "meeting"
    / "meeting.service.ts"
)


class FakeParticipant:
    def __init__(self, identity="user_ko", name="민수", attributes=None):
        self.identity = identity
        self.name = name
        self.attributes = attributes if attributes is not None else {}


def korean(identity="guest-kr-1"):
    return FakeParticipant(
        identity=identity, name="민수", attributes={LANGUAGE_ATTRIBUTE: "ko"}
    )


def vietnamese(identity="guest-vn-1"):
    return FakeParticipant(
        identity=identity, name="Linh", attributes={LANGUAGE_ATTRIBUTE: "vi"}
    )


class FakeWorker:
    """스레드도 인식도 띄우지 않는 대역."""

    def __init__(self, info, room_name, **kwargs):
        self.info = info
        self.room_name = room_name
        self.kwargs = kwargs
        self.started = False
        self.stopped = False

    def start(self):
        self.started = True

    def stop(self, timeout=10.0):
        self.stopped = True


def make_agent(**kwargs):
    return TranslationAgent(
        room_name=ROOM,
        translator_factory=lambda: object(),
        worker_factory=FakeWorker,
        **kwargs,
    )


# --- 참가자 정보 읽기 ---


def test_language_comes_from_the_livekit_attribute():
    info = read_participant(korean())

    assert info == ParticipantInfo(
        identity="guest-kr-1", display_name="민수", language="ko"
    )


def test_the_country_attribute_is_used_when_language_is_missing():
    participant = FakeParticipant(attributes={COUNTRY_ATTRIBUTE: "vn"})

    assert read_participant(participant).language == "vi"


def test_a_participant_without_language_information_is_skipped():
    # 우리 토큰 API를 거치지 않고 들어온 참가자나 에이전트 자신이다.
    assert read_participant(FakeParticipant(attributes={})) is None


def test_a_participant_with_an_unsupported_language_is_skipped():
    participant = FakeParticipant(attributes={LANGUAGE_ATTRIBUTE: "en"})

    assert read_participant(participant) is None


def test_a_participant_without_identity_is_skipped():
    assert read_participant(FakeParticipant(identity="")) is None


def test_the_identity_is_used_when_the_name_is_empty():
    participant = FakeParticipant(
        identity="guest-kr-1", name="", attributes={LANGUAGE_ATTRIBUTE: "ko"}
    )

    assert read_participant(participant).display_name == "guest-kr-1"


def test_missing_attributes_do_not_crash():
    class Bare:
        identity = "guest-kr-1"
        name = "민수"

    assert read_participant(Bare()) is None


# --- 참가자 생명주기 ---


def test_a_participant_gets_a_worker():
    agent = make_agent()

    worker = agent.add_participant(korean())

    assert worker.started is True
    assert set(agent.workers()) == {"guest-kr-1"}


def test_a_skipped_participant_gets_no_worker():
    agent = make_agent()

    assert agent.add_participant(FakeParticipant(attributes={})) is None
    assert agent.workers() == {}


def test_each_participant_gets_its_own_worker():
    agent = make_agent()

    agent.add_participant(korean())
    agent.add_participant(vietnamese())

    assert set(agent.workers()) == {"guest-kr-1", "guest-vn-1"}


def test_joining_twice_does_not_create_a_second_worker():
    agent = make_agent()

    first = agent.add_participant(korean())
    second = agent.add_participant(korean())

    assert first is second
    assert len(agent.workers()) == 1


def test_leaving_stops_the_worker():
    agent = make_agent()
    worker = agent.add_participant(korean())

    agent.remove_participant("guest-kr-1")

    # 정리하지 않으면 스레드와 큐가 남는다.
    assert worker.stopped is True
    assert agent.workers() == {}


def test_leaving_an_unknown_participant_is_safe():
    agent = make_agent()

    agent.remove_participant("never-joined")

    assert agent.workers() == {}


def test_stopping_the_agent_stops_every_worker():
    agent = make_agent()
    korean_worker = agent.add_participant(korean())
    vietnamese_worker = agent.add_participant(vietnamese())

    agent.stop()

    assert (korean_worker.stopped, vietnamese_worker.stopped) == (True, True)
    assert agent.workers() == {}


def test_each_worker_gets_its_own_translator():
    created = []

    def translator_factory():
        translator = object()
        created.append(translator)
        return translator

    agent = TranslationAgent(
        room_name=ROOM, translator_factory=translator_factory, worker_factory=FakeWorker
    )
    agent.add_participant(korean())
    agent.add_participant(vietnamese())

    # 하나를 공유하면 두 사람이 동시에 말할 때 서로를 기다린다.
    assert len(set(map(id, created))) == 2


def test_the_room_name_is_passed_to_the_worker():
    agent = make_agent()

    worker = agent.add_participant(korean())

    assert worker.room_name == ROOM


# --- Client·Server와 대조 ---
#
# 참가자 attributes 키와 국가-언어 매핑을 옮겨 적었다. 어긋나면 참가자가 통역
# 대상에서 조용히 빠진다.


def read_source(path: Path) -> str:
    assert path.exists(), f"파일을 찾을 수 없습니다: {path}"
    return path.read_text(encoding="utf-8")


def test_the_language_attribute_key_matches_the_server():
    source = read_source(SERVER_MEETING_SERVICE)

    # meeting.service.ts가 토큰 attributes에 넣는 키다.
    assert re.search(rf"\b{LANGUAGE_ATTRIBUTE}\b", source)


def test_the_country_attribute_key_matches_the_server():
    source = read_source(SERVER_MEETING_SERVICE)

    assert re.search(rf"\b{COUNTRY_ATTRIBUTE}\b", source)


def test_the_country_language_map_matches_the_shared_contract():
    source = read_source(SHARED_MEETING_CONTRACT)

    block = re.search(
        r"MEETING_PARTICIPANT_LANGUAGE_BY_COUNTRY[^{]*\{(?P<body>[^}]*)\}", source
    )
    assert block is not None, "shared에서 국가-언어 매핑을 찾지 못했습니다"

    pairs = re.findall(r"(\w+):\s*\"(\w+)\"", block.group("body"))
    assert dict(pairs) == LANGUAGE_BY_COUNTRY
