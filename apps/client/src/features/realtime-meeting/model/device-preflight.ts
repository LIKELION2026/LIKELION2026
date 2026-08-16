export type MeetingDevicePreflightStatus =
  | "idle"
  | "checking"
  | "ready"
  | "permission-denied"
  | "device-unavailable";

export interface MeetingDevicePreflightState {
  audioInputCount: number;
  message: string;
  status: MeetingDevicePreflightStatus;
  videoInputCount: number;
}

export const INITIAL_MEETING_DEVICE_PREFLIGHT_STATE: MeetingDevicePreflightState =
  {
    audioInputCount: 0,
    message: "카메라와 마이크를 확인하기 전입니다.",
    status: "idle",
    videoInputCount: 0
  };

export async function checkMeetingDevicePreflight(): Promise<MeetingDevicePreflightState> {
  if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices.enumerateDevices) {
    return {
      audioInputCount: 0,
      message: "이 브라우저에서는 카메라와 마이크 장치를 확인할 수 없습니다.",
      status: "device-unavailable",
      videoInputCount: 0
    };
  }

  let stream: MediaStream | undefined;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputCount = countDevicesByKind(devices, "audioinput");
    const videoInputCount = countDevicesByKind(devices, "videoinput");

    if (audioInputCount === 0 || videoInputCount === 0) {
      return {
        audioInputCount,
        message: "사용 가능한 카메라 또는 마이크 장치를 찾지 못했습니다.",
        status: "device-unavailable",
        videoInputCount
      };
    }

    return {
      audioInputCount,
      message: "카메라와 마이크를 사용할 수 있습니다.",
      status: "ready",
      videoInputCount
    };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      return {
        audioInputCount: 0,
        message: "브라우저에서 카메라 또는 마이크 권한이 거부되었습니다.",
        status: "permission-denied",
        videoInputCount: 0
      };
    }

    return {
      audioInputCount: 0,
      message: "사용 가능한 카메라 또는 마이크 장치를 찾지 못했습니다.",
      status: "device-unavailable",
      videoInputCount: 0
    };
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
  }
}

function countDevicesByKind(
  devices: MediaDeviceInfo[],
  kind: MediaDeviceKind
): number {
  return devices.filter((device) => device.kind === kind).length;
}

function isPermissionDeniedError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError" ||
      error.name === "SecurityError")
  );
}
