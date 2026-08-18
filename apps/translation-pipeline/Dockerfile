# LiveKit Cloud 통역 워커. 배포판이 자동 생성한 Dockerfile이 우리 폴더 구조
# (requirements.txt + scripts 3개, 표준 agent.py 단일 진입점이 아님)를 판단하다
# 멈춰서 직접 작성했다.
FROM python:3.10-slim

# 컨테이너 안에서는 stdout이 터미널이 아니라 파이프라 파이썬이 기본적으로
# 버퍼링한다. 로그 명령으로 볼 때 출력이 한참 늦게 몰아서 나오거나 아예 안
# 보이는 원인이 이것이다. 자식 프로세스까지 확실히 적용되도록 -u 대신
# 환경변수로 끈다.
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY scripts/ ./scripts/
COPY data/ ./data/

# 워커 진입점. 방이 열리면 자동으로 배정받아 참가한다.
CMD ["python", "scripts/run_agent.py", "start"]
