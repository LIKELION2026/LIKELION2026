"""자막을 Server로 발행한다.

Server가 받아서 소켓 이벤트 `subtitle.created`로 브로드캐스트하면 Client
화면에 자막이 뜬다.

발행 실패는 파이프라인을 멈추지 않는다. 자막 하나를 못 보내는 것보다 회의가
끊기는 쪽이 더 나쁘다.
"""

import json
import os
import urllib.error
import urllib.request

from .errors import TranslationPipelineError
from .subtitle import SubtitlePayload

# apps/server/.env.example의 PORT와 맞춘다. 서버가 4000, Client가 5173이다.
DEFAULT_SERVER_URL = "http://localhost:4000"
SUBTITLE_PATH = "/meeting/subtitles/mock"

# 실시간 경로라 오래 붙잡고 있으면 다음 발화 처리가 밀린다.
DEFAULT_TIMEOUT_SECONDS = 3.0

ENV_SERVER_URL = "PIPELINE_SERVER_URL"


class SubtitlePublishError(TranslationPipelineError):
    """자막 발행이 실패했을 때 발생한다."""


class SubtitlePublisher:
    """Server의 자막 엔드포인트로 POST한다."""

    def __init__(
        self,
        server_url: str | None = None,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        base = server_url or os.environ.get(ENV_SERVER_URL) or DEFAULT_SERVER_URL
        self._url = base.rstrip("/") + SUBTITLE_PATH
        self._timeout_seconds = timeout_seconds

    @property
    def url(self) -> str:
        return self._url

    def publish(self, subtitle: SubtitlePayload) -> None:
        """자막 하나를 보낸다. 실패하면 SubtitlePublishError를 던진다."""
        body = json.dumps(subtitle.to_dict()).encode("utf-8")
        request = urllib.request.Request(
            self._url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(
                request, timeout=self._timeout_seconds
            ) as response:
                if response.status >= 400:
                    raise SubtitlePublishError(
                        f"서버가 {response.status}로 응답했습니다."
                    )
        except urllib.error.HTTPError as error:
            detail = _read_error_body(error)
            raise SubtitlePublishError(
                f"서버가 {error.code}로 거절했습니다: {detail}"
            ) from error
        except urllib.error.URLError as error:
            raise SubtitlePublishError(
                f"서버에 연결하지 못했습니다 ({self._url}): {error.reason}"
            ) from error
        except OSError as error:
            raise SubtitlePublishError(f"자막 발행이 실패했습니다: {error}") from error


def _read_error_body(error: urllib.error.HTTPError) -> str:
    """서버가 왜 거절했는지 알아야 어느 필드가 문제인지 알 수 있다."""
    try:
        return error.read().decode("utf-8", errors="replace")[:300]
    except Exception:
        return "(응답 본문을 읽지 못했습니다)"
