export type MeetingDevicePreflightStatus =
  | "idle"
  | "checking"
  | "ready"
  | "permission-denied"
  | "device-unavailable"
  | "security-unavailable";

export interface MeetingDevicePreflightState {
  audioInputCount: number;
  messageKey: string;
  status: MeetingDevicePreflightStatus;
  videoInputCount: number;
}

export const INITIAL_MEETING_DEVICE_PREFLIGHT_STATE: MeetingDevicePreflightState =
  {
    audioInputCount: 0,
    messageKey: "meetingDevicePreflight.message.idle",
    status: "idle",
    videoInputCount: 0
  };

export async function checkMeetingDevicePreflight(): Promise<MeetingDevicePreflightState> {
  if (!window.isSecureContext) {
    return {
      audioInputCount: 0,
      messageKey: "meetingDevicePreflight.message.securityUnavailable",
      status: "security-unavailable",
      videoInputCount: 0
    };
  }

  if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices.enumerateDevices) {
    return {
      audioInputCount: 0,
      messageKey: "meetingDevicePreflight.message.notSupported",
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
        messageKey: "meetingDevicePreflight.message.deviceUnavailable",
        status: "device-unavailable",
        videoInputCount
      };
    }

    return {
      audioInputCount,
      messageKey: "meetingDevicePreflight.message.ready",
      status: "ready",
      videoInputCount
    };
  } catch (error) {
    if (isSecurityContextError(error)) {
      return {
        audioInputCount: 0,
        messageKey: "meetingDevicePreflight.message.securityUnavailable",
        status: "security-unavailable",
        videoInputCount: 0
      };
    }

    if (isPermissionDeniedError(error)) {
      return {
        audioInputCount: 0,
        messageKey: "meetingDevicePreflight.message.permissionDenied",
        status: "permission-denied",
        videoInputCount: 0
      };
    }

    return {
      audioInputCount: 0,
      messageKey: "meetingDevicePreflight.message.deviceUnavailable",
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
      error.name === "PermissionDeniedError")
  );
}

function isSecurityContextError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "SecurityError" || error.name === "NotSupportedError")
  );
}
