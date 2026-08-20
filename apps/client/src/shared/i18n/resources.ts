export const resources = {
  ko: {
    translation: {
      app: {
        navigationAriaLabel: "주요 메뉴"
      },
      avatar: {
        labels: {
          capybara: "카피바라",
          cat: "고양이",
          cow: "소",
          dog: "강아지",
          eagle: "독수리",
          hippo: "하마",
          monkey: "원숭이",
          parrot: "앵무새",
          red_panda: "레드판다",
          sheep: "양",
          wolf: "늑대",
          zebra: "얼룩말"
        }
      },
      calendarPresence: {
        absent: "부재",
        available: "협업 가능",
        focus: "집중 작업",
        ghost: "연결 해제",
        meeting: "회의 중",
        remote_work: "재택",
        sleeping: "퇴근",
        vacation: "휴가"
      },
      common: {
        close: "닫기",
        participant: "참가자",
        requestProcessing: "요청 처리 중",
        selfSuffix: " (나)",
        teamMember: "팀원",
        errors: {
          network: "네트워크 연결을 확인한 뒤 다시 시도해 주세요."
        }
      },
      guestOnboarding: {
        ariaLabel: "오피스 입장 설정",
        title: "함께 일할 오피스에 입장합니다",
        description: "이름, 소속 국가, 사용할 아바타를 선택하면 개인 데스크가 배정됩니다.",
        uiLanguage: {
          legend: "UI 언어",
          optionAria: "{{language}}로 UI 언어 변경"
        },
        name: {
          label: "이름",
          placeholder: "오피스에서 사용할 이름"
        },
        country: {
          legend: "소속 국가",
          korea: "한국",
          vietnam: "베트남"
        },
        avatar: {
          legend: "아바타 선택",
          help: "이미 사용 중인 아바타는 선택할 수 없습니다.",
          random: "랜덤 선택",
          inUse: "사용 중"
        },
        errors: {
          avatarAvailability: "사용 가능한 아바타를 불러오지 못했습니다.",
          avatarRequired: "아바타를 선택하거나 랜덤 선택을 눌러주세요."
        },
        submit: {
          ready: "오피스 입장",
          submitting: "오피스 준비 중"
        }
      },
      meetingChat: {
        ariaLabel: "회의 채팅",
        delete: "삭제",
        deliveryFailed: "전송 실패",
        emptyReady: "아직 채팅이 없습니다. 첫 메시지를 보내보세요.",
        emptyWaiting: "회의 연결이 완료되면 채팅이 열립니다.",
        inputAriaLabel: "채팅 메시지",
        inputPlaceholder: "회의 참가자에게 메시지 보내기",
        kindTranslation: "AI 번역",
        newMessages: "새 메시지 {{count}}개 보기",
        ownerLocal: "나",
        pendingTranslation: "번역 중",
        retry: "재시도",
        send: "전송",
        sending: "전송 중",
        title: "채팅",
        status: {
          idle: "회의 연결 대기",
          ready: "실시간 채팅 가능",
          reconnecting: "재연결 중",
          unavailable: "채팅 일시 중지"
        },
        help: {
          idle: "회의 연결이 완료되면 메시지를 보낼 수 있습니다.",
          ready: "같은 회의방에 연결된 참가자에게만 전달됩니다.",
          reconnecting: "재연결 중에는 새 메시지 전송을 잠시 멈춥니다.",
          unavailable: "회의 연결이 완료되면 메시지를 보낼 수 있습니다."
        },
        validation: {
          empty: "메시지를 입력해 주세요.",
          tooLong: "채팅은 {{max}}자까지 보낼 수 있습니다."
        },
        errors: {
          generic: "채팅 메시지를 처리하지 못했습니다.",
          retryNotFound: "재시도할 메시지를 찾지 못했습니다."
        }
      },
      meetingControls: {
        toolbarAriaLabel: "회의 컨트롤",
        camera: {
          disable: "영상 끄기",
          disabled: "카메라 꺼짐",
          enable: "영상 켜기",
          enabled: "카메라 켜짐",
          updating: "영상 변경 중"
        },
        expandedView: {
          collapse: "화면 줄이기",
          expanded: "확대 화면 켜짐",
          expand: "화면 키우기",
          normal: "일반 화면"
        },
        microphone: {
          disable: "소리 끄기",
          disabled: "마이크 꺼짐",
          enable: "소리 켜기",
          enabled: "마이크 켜짐",
          updating: "소리 변경 중"
        },
        translation: {
          disabled: "번역 꺼짐",
          disable: "AI 번역 OFF",
          enable: "AI 번역 ON",
          enabled: "번역 켜짐",
          unavailable: "회의 연결 후 AI 번역 설정 가능",
          updating: "AI 번역 변경 중"
        }
      },
      meetingDevicePreflight: {
        cameraMicrophone: "카메라/마이크",
        check: "장치 확인",
        checkingButton: "확인 중",
        message: {
          checking: "카메라와 마이크 권한을 확인하고 있습니다.",
          deviceUnavailable: "사용 가능한 카메라 또는 마이크 장치를 찾지 못했습니다.",
          idle: "카메라와 마이크를 확인하기 전입니다.",
          notSupported: "이 브라우저에서는 카메라와 마이크 장치를 확인할 수 없습니다.",
          permissionDenied: "브라우저에서 카메라 또는 마이크 권한이 거부되었습니다.",
          ready: "카메라와 마이크를 사용할 수 있습니다.",
          securityUnavailable: "보안 연결이 아니어서 카메라와 마이크 권한을 요청할 수 없습니다."
        },
        status: {
          checking: "확인 중",
          "device-unavailable": "장치 없음",
          idle: "확인 전",
          "permission-denied": "권한 거부",
          ready: "입장 가능",
          "security-unavailable": "보안 연결 필요"
        }
      },
      meetingErrors: {
        cameraToggleFailed: "카메라 상태를 바꾸지 못했습니다.",
        connectionPrepareFailed: "회의 연결을 준비하지 못했습니다.",
        liveKitConnectionFailed: "LiveKit 회의방 연결에 실패했습니다.",
        microphoneToggleFailed: "마이크 상태를 바꾸지 못했습니다.",
        subtitlesLoadFailed: "자막 목록을 불러오지 못했습니다.",
        tokenCreateFailed: "회의 토큰을 만들지 못했습니다.",
        unsupportedSubtitleUpdate: "지원하지 않는 자막 업데이트 방식입니다."
      },
      meetingLab: {
        connectedMessage: "{{roomName}} 회의방에 연결했습니다. 토큰 만료 시각: {{expiresAt}}",
        country: "국가",
        description: "LiveKit 입장 정보와 회의 섹션을 확인합니다.",
        deviceCounts: {
          camera: "Camera {{count}}",
          mic: "Mic {{count}}"
        },
        form: {
          connect: "회의 연결",
          connecting: "회의 연결 중",
          userName: "사용자 이름"
        },
        liveKitStatus: "LiveKit 상태",
        meetingSection: "회의 섹션",
        participantId: "참가자 ID: {{participantId}}",
        publishedCounts: {
          camera: "Published camera {{count}}",
          mic: "Published mic {{count}}",
          remoteParticipants: "Remote participants {{count}}"
        },
        title: "Meeting Lab",
        leave: "회의 나가기"
      },
      meetingMedia: {
        cameraDisabled: "카메라 꺼짐",
        cameraDisable: "카메라 끄기",
        cameraEnable: "카메라 켜기",
        empty: "아직 표시할 카메라 영상이 없습니다.",
        localSuffix: " (나)",
        microphoneDisable: "마이크 끄기",
        microphoneEnable: "마이크 켜기"
      },
      meetingParticipants: {
        expandedAriaLabel: "확대된 회의 참가자 영상",
        emptyAriaLabel: "회의 참가자 정보를 준비하고 있습니다.",
        grid: {
          connecting: "확대 화면 연결 중",
          empty: "확대 화면 참가자 없음",
          ready: "확대 화면에서 {{count}}명 참가 중",
          reconnecting: "확대 화면 재연결 중"
        },
        localPrefix: "나 · {{name}}",
        microphone: {
          disabled: "마이크 꺼짐",
          enabled: "마이크 켜짐"
        },
        strip: {
          ariaLabel: "회의 참가자 영상",
          connecting: "연결 중",
          empty: "참가자 없음",
          ready: "{{count}}명 참가 중",
          reconnecting: "재연결 중"
        },
        video: {
          disabled: "카메라 꺼짐",
          enabled: "영상 켜짐",
          preparing: "영상 준비 중"
        },
        connectionQuality: {
          excellent: "연결 매우 좋음",
          good: "연결 좋음",
          lost: "연결 끊김",
          poor: "연결 불안정",
          unknown: "연결 확인 중"
        }
      },
      meetingRoomOverlay: {
        ariaLabel: "인게임 회의 오버레이",
        chatPanelAriaLabel: "회의 채팅 패널",
        liveTranslationAriaLabel: "실시간 AI 번역",
        translationStatusAriaLabel: "AI 번역 상태"
      },
      meetingRoomSections: {
        main: "Meeting Room",
        room1: "Meeting Room 1",
        room2: "Meeting Room 2",
        room3: "Meeting Room 3"
      },
      meetingSessionStatus: {
        connected: "연결됨",
        connecting: "연결 중",
        disconnected: "연결 종료",
        failed: "연결 실패",
        idle: "대기 중",
        publishing: "트랙 게시 중",
        reconnecting: "재연결 중"
      },
      meetingSubtitles: {
        empty: "아직 표시할 자막이 없습니다.",
        final: "확정",
        partial: "임시",
        subtitleMock: "Subtitle Mock",
        title: "실시간 자막",
        status: {
          disconnected: "연결 종료",
          failed: "오류",
          idle: "대기",
          loading: "연결 중",
          subscribed: "수신 중"
        }
      },
      meetingTranslation: {
        cancel: "취소",
        description: "저장한 이후부터 생성되는 AI 번역만 채팅과 하단 자막에 표시됩니다.",
        eyebrow: "AI TRANSLATION",
        save: "AI 번역 켜기",
        saving: "저장 중",
        sourceLanguage: "나의 언어",
        targetLanguage: "상대방에게 보여줄 언어",
        title: "번역 언어 설정",
        validation: {
          sameLanguage: "나의 언어와 상대방에게 보여줄 언어는 서로 달라야 합니다.",
          unsupportedLanguage: "지원하는 번역 언어는 한국어와 베트남어입니다."
        },
        errors: {
          saveFailed: "AI 번역 설정을 저장하지 못했습니다.",
          turnOffFailed: "AI 번역을 끄지 못했습니다.",
          unavailableUntilConnected: "회의 연결이 완료된 뒤 AI 번역을 켤 수 있습니다."
        }
      },
      meetingTranslationAvailability: {
        connecting: {
          description: "회의방 자막 채널을 준비하고 있습니다.",
          title: "AI 번역 연결 중"
        },
        off: {
          description: "일반 채팅은 계속 사용할 수 있습니다.",
          title: "AI 번역 꺼짐"
        },
        ready: {
          description: "상대방이 말하면 번역이 채팅과 하단 자막에 표시됩니다.",
          title: "AI 번역 대기 중"
        },
        unavailable: {
          description: "자막 서버 연결을 확인한 뒤 다시 시도해 주세요.",
          title: "AI 번역 연결 실패"
        }
      },
      memberStatus: {
        available: "협업 가능",
        away: "자리 비움",
        focused: "집중 작업",
        in_meeting: "회의 중"
      },
      office: {
        ariaLabel: "가상 오피스"
      },
      officeCalendar: {
        ariaLabel: "협업 보드",
        add: "일정 추가",
        allDay: "종일",
        close: "협업 보드 닫기",
        dateYear: "{{year}}년",
        deleteAriaLabel: "{{title}} 삭제",
        empty: "등록된 일정이 없습니다.",
        endTime: "종료 시간",
        eventTypeAriaLabel: "일정 종류",
        formTitlePlaceholder: "예: 베트남 팀과 기획 회의",
        legendAll: "이번 달 일정 참여자 전체",
        legendFilter: "이번 달 일정 참여자 필터",
        legendMore: "참여자 {{count}}명 더 보기",
        loading: "일정을 불러오는 중입니다.",
        location: "장소",
        locationPlaceholder: "장소 (선택)",
        monthly: "월간",
        nextMonth: "다음 달 보기",
        ownerCount: "참여자 {{count}}명",
        previousMonth: "이전 달 보기",
        resetFilter: "전체 보기로 되돌리기",
        retry: "다시 시도",
        saving: "저장 중",
        startTime: "시작 시간",
        tableHeadSchedule: "일정",
        tableHeadTime: "시간",
        title: "공유 캘린더",
        today: "오늘",
        eventTypes: {
          absence: "부재",
          focus: "집중",
          meeting: "회의",
          remote_work: "재택",
          vacation: "휴가"
        },
        errors: {
          deleteFailed: "일정을 삭제하지 못했습니다. 다시 시도해 주세요.",
          endBeforeStart: "종료 시간이 시작 시간보다 빨라요.",
          loadFailed: "공유 일정을 불러오지 못했습니다.",
          saveFailed: "일정을 저장하지 못했습니다. 다시 시도해 주세요.",
          sessionRequired: "오피스 세션이 준비되지 않았습니다."
        },
        success: {
          deleted: "일정을 삭제했습니다.",
          saved: "일정을 공유했습니다."
        }
      },
      officeCollisionEditor: {
        addArea: "영역 추가",
        addZone: "구역 추가",
        areaCount: "{{count}}개",
        areaList: "영역 목록",
        areaListAriaLabel: "충돌 영역 목록",
        blueZoneHelp: "파란 구역은 가구 충돌과 겹칠 수 있으며, 드래그로 위치와 크기를 조정합니다.",
        canvasAriaLabel: "충돌 영역 편집 캔버스",
        checkInOffice: "오피스에서 확인",
        copied: "복사됨",
        copyJson: "JSON 복사",
        delete: "삭제",
        description: "충돌 영역, 화상회의 구역, 팀원의 초기 자리를 한 화면에서 조정하세요.",
        developmentTool: "DEVELOPMENT TOOL",
        deskMarkerHelp: "초록 마커는 새 팀원의 생성·복원 기준 자리입니다.",
        deskSettings: "초기 자리",
        id: "식별자",
        label: "이름",
        mapAlt: "오피스 맵",
        meetingZoneSettings: "화상회의 구역",
        meetingZoneSettingsAriaLabel: "화상회의 구역 설정",
        reset: "초기화",
        selectedArea: "선택한 영역",
        selectedAreaAriaLabel: "선택한 충돌 영역 속성",
        selectedMeetingZone: "선택한 회의 구역",
        startBadge: "시작",
        title: "오피스 맵 편집기",
        legend: {
          area: "충돌 영역",
          desk: "초기 자리",
          help: "충돌·회의 구역: 드래그 이동 · 모서리 드래그 크기 조정",
          meeting: "화상회의 구역",
          selected: "선택된 영역"
        }
      },
      officeHud: {
        ariaLabel: "오피스 상태",
        attendance: {
          checkIn: "🏢 출근하기",
          checkOut: "🌙 퇴근하기"
        },
        connection: {
          connected: "오피스 연결됨",
          connecting: "오피스 연결 중",
          disconnected: "오피스 연결 끊김",
          reconnecting: "오피스 재연결 중"
        },
        memberCount: "현재 오피스 {{count}}명",
        navigation: {
          calendar: "📅 협업 보드",
          people: "👥 피플 목록",
          todo: "📋 내 TODO"
        },
        settings: {
          uiLanguage: "UI 언어"
        },
        statusAriaLabel: "내 협업 상태",
        teamName: "Demo Global Team"
      },
      officeLoading: {
        ariaLabel: "오피스 준비 중",
        message: "오피스를 준비하고 있어요"
      },
      officeMap: {
        meetingZones: {
          mainMeetingRoom: "회의실 4",
          meetingRoom1: "회의실 1",
          meetingRoom2: "회의실 2",
          meetingRoom3: "회의실 3"
        }
      },
      officeMeetingSummaryAlert: {
        close: "알림 닫기",
        description: "공유 캘린더에서 확인해 보세요",
        open: "회의 요약 보러 가기",
        title: "회의 요약 도착!"
      },
      officePeoplePanel: {
        ariaLabel: "피플 목록",
        close: "피플 목록 닫기",
        country: {
          korea: "한국",
          vietnam: "베트남"
        },
        empty: "현재 오피스에 표시할 팀원이 없습니다.",
        focus: "찾아가기",
        profileTodoAriaLabel: "{{name}}의 공개 TODO",
        publicTodoEmpty: "공개한 오늘의 업무가 없습니다.",
        publicTodoTitle: "공개한 오늘의 업무",
        summon: "불러오기",
        teamEyebrow: "TEAM",
        title: "피플 목록",
        todoLoadError: "TODO 정보를 불러오지 못했습니다.",
        todoLoading: "TODO 정보를 불러오는 중입니다."
      },
      officeSession: {
        errors: {
          avatarInUse: "방금 다른 팀원이 선택했어요. 다른 아바타를 골라주세요.",
          network: "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
          noAvailableAvatar: "현재 선택 가능한 아바타가 없습니다.",
          prepareFailed: "오피스 세션을 준비하지 못했습니다.",
          prepareFailedRetry: "오피스 세션을 준비하지 못했습니다. 다시 시도해 주세요."
        }
      },
      officeSummon: {
        accept: "이동하기",
        decline: "거절",
        eyebrow: "TEAM REQUEST",
        title: "{{requesterName}}가 당신을 불러오기를 원합니다."
      },
      officeTodoPanel: {
        ariaLabel: "상태 변경 및 내 업무",
        close: "닫기",
        empty: "아직 작성한 TODO가 없습니다.",
        inputAriaLabel: "오늘 진행할 업무",
        inputPlaceholder: "오늘 진행할 업무를 적어주세요",
        listAriaLabel: "내 TODO 목록",
        loading: "TODO 정보를 불러오는 중입니다.",
        public: "공개",
        publicToTeam: "팀에 공개하기",
        retry: "다시 시도",
        retrying: "다시 불러오는 중",
        save: "저장",
        statusAriaLabel: "{{title}} 상태",
        statusChoices: {
          away: "자리비움",
          home: "재택",
          leave: "퇴근",
          office: "사무실"
        },
        statusTitle: "상태변경",
        title: "상태변경 / 투두",
        todoDeleteAriaLabel: "{{title}} 삭제",
        todoDeleteError: "TODO를 삭제하지 못했습니다. 다시 시도해 주세요.",
        todoDeleteSuccess: "TODO를 삭제했습니다.",
        todoSaveError: "TODO를 저장하지 못했습니다. 다시 시도해 주세요.",
        todoSaveSuccess: "TODO를 저장했습니다.",
        todoUpdateError: "TODO를 수정하지 못했습니다. 다시 시도해 주세요.",
        todoUpdateSuccess: "TODO를 업데이트했습니다."
      },
      todoStatus: {
        blocked: "도움 필요",
        done: "완료",
        in_progress: "진행 중",
        planned: "예정"
      }
    }
  },
  vi: {
    translation: {
      app: {
        navigationAriaLabel: "Menu chính"
      },
      avatar: {
        labels: {
          capybara: "Chuột lang nước",
          cat: "Mèo",
          cow: "Bò",
          dog: "Chó",
          eagle: "Đại bàng",
          hippo: "Hà mã",
          monkey: "Khỉ",
          parrot: "Vẹt",
          red_panda: "Gấu trúc đỏ",
          sheep: "Cừu",
          wolf: "Sói",
          zebra: "Ngựa vằn"
        }
      },
      calendarPresence: {
        absent: "Vắng mặt",
        available: "Sẵn sàng cộng tác",
        focus: "Đang tập trung",
        ghost: "Mất kết nối",
        meeting: "Đang họp",
        remote_work: "Làm việc từ xa",
        sleeping: "Đã kết thúc",
        vacation: "Nghỉ phép"
      },
      common: {
        close: "Đóng",
        participant: "Người tham gia",
        requestProcessing: "Đang xử lý yêu cầu",
        selfSuffix: " (tôi)",
        teamMember: "Thành viên",
        errors: {
          network: "Vui lòng kiểm tra kết nối mạng rồi thử lại."
        }
      },
      guestOnboarding: {
        ariaLabel: "Thiết lập vào văn phòng",
        title: "Vào văn phòng làm việc chung",
        description: "Chọn tên, quốc gia và avatar để nhận bàn làm việc cá nhân.",
        uiLanguage: {
          legend: "Ngôn ngữ UI",
          optionAria: "Đổi ngôn ngữ UI sang {{language}}"
        },
        name: {
          label: "Tên",
          placeholder: "Tên dùng trong văn phòng"
        },
        country: {
          legend: "Quốc gia",
          korea: "Hàn Quốc",
          vietnam: "Việt Nam"
        },
        avatar: {
          legend: "Chọn avatar",
          help: "Không thể chọn avatar đang được người khác dùng.",
          random: "Chọn ngẫu nhiên",
          inUse: "Đang dùng"
        },
        errors: {
          avatarAvailability: "Không thể tải danh sách avatar khả dụng.",
          avatarRequired: "Hãy chọn avatar hoặc dùng chọn ngẫu nhiên."
        },
        submit: {
          ready: "Vào văn phòng",
          submitting: "Đang chuẩn bị văn phòng"
        }
      },
      meetingChat: {
        ariaLabel: "Trò chuyện cuộc họp",
        delete: "Xóa",
        deliveryFailed: "Gửi thất bại",
        emptyReady: "Chưa có tin nhắn. Hãy gửi tin nhắn đầu tiên.",
        emptyWaiting: "Trò chuyện sẽ mở khi cuộc họp kết nối xong.",
        inputAriaLabel: "Tin nhắn trò chuyện",
        inputPlaceholder: "Gửi tin nhắn cho người tham gia",
        kindTranslation: "AI dịch",
        newMessages: "Xem {{count}} tin nhắn mới",
        ownerLocal: "Tôi",
        pendingTranslation: "Đang dịch",
        retry: "Thử lại",
        send: "Gửi",
        sending: "Đang gửi",
        title: "Trò chuyện",
        status: {
          idle: "Đang chờ kết nối họp",
          ready: "Có thể trò chuyện trực tiếp",
          reconnecting: "Đang kết nối lại",
          unavailable: "Tạm dừng trò chuyện"
        },
        help: {
          idle: "Bạn có thể gửi tin nhắn sau khi cuộc họp kết nối xong.",
          ready: "Chỉ gửi cho người đang ở cùng phòng họp.",
          reconnecting: "Tạm dừng gửi tin nhắn mới trong lúc kết nối lại.",
          unavailable: "Bạn có thể gửi tin nhắn sau khi cuộc họp kết nối xong."
        },
        validation: {
          empty: "Vui lòng nhập tin nhắn.",
          tooLong: "Tin nhắn tối đa {{max}} ký tự."
        },
        errors: {
          generic: "Không thể xử lý tin nhắn.",
          retryNotFound: "Không tìm thấy tin nhắn để thử lại."
        }
      },
      meetingControls: {
        toolbarAriaLabel: "Điều khiển cuộc họp",
        camera: {
          disable: "Tắt video",
          disabled: "Camera tắt",
          enable: "Bật video",
          enabled: "Camera bật",
          updating: "Đang đổi video"
        },
        expandedView: {
          collapse: "Thu nhỏ màn hình",
          expanded: "Đang bật màn hình mở rộng",
          expand: "Mở rộng màn hình",
          normal: "Màn hình thường"
        },
        microphone: {
          disable: "Tắt âm thanh",
          disabled: "Micro tắt",
          enable: "Bật âm thanh",
          enabled: "Micro bật",
          updating: "Đang đổi âm thanh"
        },
        translation: {
          disabled: "Dịch tắt",
          disable: "Tắt AI dịch",
          enable: "Bật AI dịch",
          enabled: "Dịch bật",
          unavailable: "Có thể bật AI dịch sau khi kết nối họp",
          updating: "Đang đổi AI dịch"
        }
      },
      meetingDevicePreflight: {
        cameraMicrophone: "Camera/Micro",
        check: "Kiểm tra thiết bị",
        checkingButton: "Đang kiểm tra",
        message: {
          checking: "Đang kiểm tra quyền camera và micro.",
          deviceUnavailable: "Không tìm thấy camera hoặc micro khả dụng.",
          idle: "Chưa kiểm tra camera và micro.",
          notSupported: "Trình duyệt này không thể kiểm tra camera và micro.",
          permissionDenied: "Trình duyệt đã từ chối quyền camera hoặc micro.",
          ready: "Có thể dùng camera và micro.",
          securityUnavailable: "Không thể xin quyền camera và micro vì kết nối không an toàn."
        },
        status: {
          checking: "Đang kiểm tra",
          "device-unavailable": "Không có thiết bị",
          idle: "Chưa kiểm tra",
          "permission-denied": "Bị từ chối quyền",
          ready: "Có thể vào",
          "security-unavailable": "Cần kết nối an toàn"
        }
      },
      meetingErrors: {
        cameraToggleFailed: "Không thể đổi trạng thái camera.",
        connectionPrepareFailed: "Không thể chuẩn bị kết nối cuộc họp.",
        liveKitConnectionFailed: "Không thể kết nối phòng họp LiveKit.",
        microphoneToggleFailed: "Không thể đổi trạng thái micro.",
        subtitlesLoadFailed: "Không thể tải danh sách phụ đề.",
        tokenCreateFailed: "Không thể tạo token cuộc họp.",
        unsupportedSubtitleUpdate: "Kiểu cập nhật phụ đề không được hỗ trợ."
      },
      meetingLab: {
        connectedMessage: "Đã kết nối phòng {{roomName}}. Token hết hạn lúc: {{expiresAt}}",
        country: "Quốc gia",
        description: "Kiểm tra thông tin vào LiveKit và khu vực họp.",
        deviceCounts: {
          camera: "Camera {{count}}",
          mic: "Mic {{count}}"
        },
        form: {
          connect: "Kết nối họp",
          connecting: "Đang kết nối họp",
          userName: "Tên người dùng"
        },
        liveKitStatus: "Trạng thái LiveKit",
        meetingSection: "Khu vực họp",
        participantId: "ID người tham gia: {{participantId}}",
        publishedCounts: {
          camera: "Camera đã phát {{count}}",
          mic: "Mic đã phát {{count}}",
          remoteParticipants: "Người tham gia từ xa {{count}}"
        },
        title: "Meeting Lab",
        leave: "Rời cuộc họp"
      },
      meetingMedia: {
        cameraDisabled: "Camera tắt",
        cameraDisable: "Tắt camera",
        cameraEnable: "Bật camera",
        empty: "Chưa có video camera để hiển thị.",
        localSuffix: " (tôi)",
        microphoneDisable: "Tắt micro",
        microphoneEnable: "Bật micro"
      },
      meetingParticipants: {
        expandedAriaLabel: "Video người tham gia ở chế độ mở rộng",
        emptyAriaLabel: "Đang chuẩn bị thông tin người tham gia.",
        grid: {
          connecting: "Đang kết nối màn hình mở rộng",
          empty: "Không có người tham gia trong màn hình mở rộng",
          ready: "{{count}} người đang tham gia trong màn hình mở rộng",
          reconnecting: "Đang kết nối lại màn hình mở rộng"
        },
        localPrefix: "Tôi · {{name}}",
        microphone: {
          disabled: "Micro tắt",
          enabled: "Micro bật"
        },
        strip: {
          ariaLabel: "Video người tham gia cuộc họp",
          connecting: "Đang kết nối",
          empty: "Không có người tham gia",
          ready: "{{count}} người đang tham gia",
          reconnecting: "Đang kết nối lại"
        },
        video: {
          disabled: "Camera tắt",
          enabled: "Video bật",
          preparing: "Đang chuẩn bị video"
        },
        connectionQuality: {
          excellent: "Kết nối rất tốt",
          good: "Kết nối tốt",
          lost: "Mất kết nối",
          poor: "Kết nối không ổn định",
          unknown: "Đang kiểm tra kết nối"
        }
      },
      meetingRoomOverlay: {
        ariaLabel: "Lớp phủ họp trong văn phòng",
        chatPanelAriaLabel: "Bảng trò chuyện cuộc họp",
        liveTranslationAriaLabel: "AI dịch trực tiếp",
        translationStatusAriaLabel: "Trạng thái AI dịch"
      },
      meetingRoomSections: {
        main: "Phòng họp",
        room1: "Phòng họp 1",
        room2: "Phòng họp 2",
        room3: "Phòng họp 3"
      },
      meetingSessionStatus: {
        connected: "Đã kết nối",
        connecting: "Đang kết nối",
        disconnected: "Đã ngắt kết nối",
        failed: "Kết nối thất bại",
        idle: "Đang chờ",
        publishing: "Đang phát track",
        reconnecting: "Đang kết nối lại"
      },
      meetingSubtitles: {
        empty: "Chưa có phụ đề để hiển thị.",
        final: "Hoàn tất",
        partial: "Tạm thời",
        subtitleMock: "Subtitle Mock",
        title: "Phụ đề trực tiếp",
        status: {
          disconnected: "Đã ngắt",
          failed: "Lỗi",
          idle: "Chờ",
          loading: "Đang kết nối",
          subscribed: "Đang nhận"
        }
      },
      meetingTranslation: {
        cancel: "Hủy",
        description: "Chỉ bản dịch AI được tạo sau khi lưu mới hiển thị trong chat và phụ đề dưới màn hình.",
        eyebrow: "AI TRANSLATION",
        save: "Bật AI dịch",
        saving: "Đang lưu",
        sourceLanguage: "Ngôn ngữ của tôi",
        targetLanguage: "Ngôn ngữ hiển thị cho người khác",
        title: "Thiết lập ngôn ngữ dịch",
        validation: {
          sameLanguage: "Ngôn ngữ của tôi và ngôn ngữ hiển thị cho người khác phải khác nhau.",
          unsupportedLanguage: "Ngôn ngữ dịch được hỗ trợ là tiếng Hàn và tiếng Việt."
        },
        errors: {
          saveFailed: "Không thể lưu thiết lập AI dịch.",
          turnOffFailed: "Không thể tắt AI dịch.",
          unavailableUntilConnected: "Có thể bật AI dịch sau khi cuộc họp kết nối xong."
        }
      },
      meetingTranslationAvailability: {
        connecting: {
          description: "Đang chuẩn bị kênh phụ đề của phòng họp.",
          title: "Đang kết nối AI dịch"
        },
        off: {
          description: "Trò chuyện thường vẫn có thể sử dụng.",
          title: "AI dịch đang tắt"
        },
        ready: {
          description: "Khi người khác nói, bản dịch sẽ hiển thị trong chat và phụ đề dưới màn hình.",
          title: "AI dịch đang chờ"
        },
        unavailable: {
          description: "Vui lòng kiểm tra kết nối máy chủ phụ đề rồi thử lại.",
          title: "Kết nối AI dịch thất bại"
        }
      },
      memberStatus: {
        available: "Sẵn sàng cộng tác",
        away: "Vắng mặt",
        focused: "Đang tập trung",
        in_meeting: "Đang họp"
      },
      office: {
        ariaLabel: "Văn phòng ảo"
      },
      officeCalendar: {
        ariaLabel: "Bảng cộng tác",
        add: "Thêm lịch",
        allDay: "Cả ngày",
        close: "Đóng bảng cộng tác",
        dateYear: "Năm {{year}}",
        deleteAriaLabel: "Xóa {{title}}",
        empty: "Chưa có lịch nào.",
        endTime: "Giờ kết thúc",
        eventTypeAriaLabel: "Loại lịch",
        formTitlePlaceholder: "Ví dụ: Họp kế hoạch với nhóm Việt Nam",
        legendAll: "Tất cả người tham gia lịch tháng này",
        legendFilter: "Bộ lọc người tham gia lịch tháng này",
        legendMore: "Xem thêm {{count}} người tham gia",
        loading: "Đang tải lịch.",
        location: "Địa điểm",
        locationPlaceholder: "Địa điểm (tùy chọn)",
        monthly: "Tháng",
        nextMonth: "Xem tháng sau",
        ownerCount: "{{count}} người tham gia",
        previousMonth: "Xem tháng trước",
        resetFilter: "Quay lại xem tất cả",
        retry: "Thử lại",
        saving: "Đang lưu",
        startTime: "Giờ bắt đầu",
        tableHeadSchedule: "Lịch",
        tableHeadTime: "Thời gian",
        title: "Lịch chung",
        today: "Hôm nay",
        eventTypes: {
          absence: "Vắng mặt",
          focus: "Tập trung",
          meeting: "Họp",
          remote_work: "Làm việc từ xa",
          vacation: "Nghỉ phép"
        },
        errors: {
          deleteFailed: "Không thể xóa lịch. Vui lòng thử lại.",
          endBeforeStart: "Giờ kết thúc phải sau giờ bắt đầu.",
          loadFailed: "Không thể tải lịch chung.",
          saveFailed: "Không thể lưu lịch. Vui lòng thử lại.",
          sessionRequired: "Phiên văn phòng chưa sẵn sàng."
        },
        success: {
          deleted: "Đã xóa lịch.",
          saved: "Đã chia sẻ lịch."
        }
      },
      officeCollisionEditor: {
        addArea: "Thêm vùng",
        addZone: "Thêm khu vực",
        areaCount: "{{count}} mục",
        areaList: "Danh sách vùng",
        areaListAriaLabel: "Danh sách vùng va chạm",
        blueZoneHelp: "Vùng màu xanh có thể chồng lên vùng va chạm đồ nội thất; kéo để đổi vị trí và kích thước.",
        canvasAriaLabel: "Canvas chỉnh vùng va chạm",
        checkInOffice: "Kiểm tra trong văn phòng",
        copied: "Đã sao chép",
        copyJson: "Sao chép JSON",
        delete: "Xóa",
        description: "Điều chỉnh vùng va chạm, khu vực họp video và vị trí ban đầu của thành viên trên cùng một màn hình.",
        developmentTool: "DEVELOPMENT TOOL",
        deskMarkerHelp: "Marker màu xanh lá là vị trí chuẩn để tạo hoặc khôi phục thành viên mới.",
        deskSettings: "Vị trí ban đầu",
        id: "Mã định danh",
        label: "Tên",
        mapAlt: "Bản đồ văn phòng",
        meetingZoneSettings: "Khu vực họp video",
        meetingZoneSettingsAriaLabel: "Thiết lập khu vực họp video",
        reset: "Đặt lại",
        selectedArea: "Vùng đã chọn",
        selectedAreaAriaLabel: "Thuộc tính vùng va chạm đã chọn",
        selectedMeetingZone: "Khu vực họp đã chọn",
        startBadge: "Bắt đầu",
        title: "Trình chỉnh bản đồ văn phòng",
        legend: {
          area: "Vùng va chạm",
          desk: "Vị trí ban đầu",
          help: "Vùng va chạm/họp: kéo để di chuyển · kéo góc để đổi kích thước",
          meeting: "Khu vực họp video",
          selected: "Vùng đã chọn"
        }
      },
      officeHud: {
        ariaLabel: "Trạng thái văn phòng",
        attendance: {
          checkIn: "🏢 Bắt đầu làm việc",
          checkOut: "🌙 Kết thúc làm việc"
        },
        connection: {
          connected: "Đã kết nối văn phòng",
          connecting: "Đang kết nối văn phòng",
          disconnected: "Mất kết nối văn phòng",
          reconnecting: "Đang kết nối lại văn phòng"
        },
        memberCount: "Hiện có {{count}} người trong văn phòng",
        navigation: {
          calendar: "📅 Bảng cộng tác",
          people: "👥 Danh sách thành viên",
          todo: "📋 TODO của tôi"
        },
        settings: {
          uiLanguage: "Ngôn ngữ UI"
        },
        statusAriaLabel: "Trạng thái cộng tác của tôi",
        teamName: "Demo Global Team"
      },
      officeLoading: {
        ariaLabel: "Đang chuẩn bị văn phòng",
        message: "Đang chuẩn bị văn phòng"
      },
      officeMap: {
        meetingZones: {
          mainMeetingRoom: "Phòng họp 4",
          meetingRoom1: "Phòng họp 1",
          meetingRoom2: "Phòng họp 2",
          meetingRoom3: "Phòng họp 3"
        }
      },
      officeMeetingSummaryAlert: {
        close: "Đóng thông báo",
        description: "Kiểm tra trong lịch chung",
        open: "Xem tóm tắt cuộc họp",
        title: "Đã có tóm tắt cuộc họp!"
      },
      officePeoplePanel: {
        ariaLabel: "Danh sách thành viên",
        close: "Đóng danh sách thành viên",
        country: {
          korea: "Hàn Quốc",
          vietnam: "Việt Nam"
        },
        empty: "Hiện không có thành viên nào để hiển thị trong văn phòng.",
        focus: "Đi tới",
        profileTodoAriaLabel: "TODO công khai của {{name}}",
        publicTodoEmpty: "Không có công việc hôm nay được công khai.",
        publicTodoTitle: "Công việc hôm nay đã công khai",
        summon: "Gọi đến",
        teamEyebrow: "TEAM",
        title: "Danh sách thành viên",
        todoLoadError: "Không thể tải thông tin TODO.",
        todoLoading: "Đang tải thông tin TODO."
      },
      officeSession: {
        errors: {
          avatarInUse: "Một thành viên khác vừa chọn avatar này. Hãy chọn avatar khác.",
          network: "Vui lòng kiểm tra kết nối mạng rồi thử lại.",
          noAvailableAvatar: "Hiện không còn avatar khả dụng.",
          prepareFailed: "Không thể chuẩn bị phiên văn phòng.",
          prepareFailedRetry: "Không thể chuẩn bị phiên văn phòng. Vui lòng thử lại."
        }
      },
      officeSummon: {
        accept: "Di chuyển",
        decline: "Từ chối",
        eyebrow: "TEAM REQUEST",
        title: "{{requesterName}} muốn gọi bạn đến."
      },
      officeTodoPanel: {
        ariaLabel: "Đổi trạng thái và TODO của tôi",
        close: "Đóng",
        empty: "Bạn chưa tạo TODO nào.",
        inputAriaLabel: "Công việc hôm nay",
        inputPlaceholder: "Nhập công việc hôm nay",
        listAriaLabel: "Danh sách TODO của tôi",
        loading: "Đang tải thông tin TODO.",
        public: "Công khai",
        publicToTeam: "Công khai với nhóm",
        retry: "Thử lại",
        retrying: "Đang tải lại",
        save: "Lưu",
        statusAriaLabel: "Trạng thái của {{title}}",
        statusChoices: {
          away: "Vắng mặt",
          home: "Từ xa",
          leave: "Kết thúc",
          office: "Văn phòng"
        },
        statusTitle: "Đổi trạng thái",
        title: "Trạng thái / TODO",
        todoDeleteAriaLabel: "Xóa {{title}}",
        todoDeleteError: "Không thể xóa TODO. Vui lòng thử lại.",
        todoDeleteSuccess: "Đã xóa TODO.",
        todoSaveError: "Không thể lưu TODO. Vui lòng thử lại.",
        todoSaveSuccess: "Đã lưu TODO.",
        todoUpdateError: "Không thể cập nhật TODO. Vui lòng thử lại.",
        todoUpdateSuccess: "Đã cập nhật TODO."
      },
      todoStatus: {
        blocked: "Cần hỗ trợ",
        done: "Hoàn thành",
        in_progress: "Đang làm",
        planned: "Dự kiến"
      }
    }
  }
} as const;
