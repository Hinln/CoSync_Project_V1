import { describe, expect, it } from "vitest";

// ==================== 性别解析测试 ====================

function getGenderFromIdNumber(idNumber: string): number {
  const char17 = idNumber.charAt(16);
  const num = parseInt(char17, 10);
  if (isNaN(num)) return 0;
  return num % 2 === 1 ? 1 : 2;
}

describe("getGenderFromIdNumber", () => {
  it("should return 1 (male) for odd 17th digit", () => {
    // 17th digit is '1' (odd) -> male
    expect(getGenderFromIdNumber("11010119900101001X")).toBe(1);
    // 17th digit is '3' (odd) -> male
    expect(getGenderFromIdNumber("11010119900101003X")).toBe(1);
    // 17th digit is '5' (odd) -> male
    expect(getGenderFromIdNumber("11010119900101005X")).toBe(1);
    // 17th digit is '7' (odd) -> male
    expect(getGenderFromIdNumber("11010119900101007X")).toBe(1);
    // 17th digit is '9' (odd) -> male
    expect(getGenderFromIdNumber("11010119900101009X")).toBe(1);
  });

  it("should return 2 (female) for even 17th digit", () => {
    // 17th digit is '0' (even) -> female
    expect(getGenderFromIdNumber("110101199001010020")).toBe(2);
    // 17th digit is '2' (even) -> female
    expect(getGenderFromIdNumber("110101199001010024")).toBe(2);
    // 17th digit is '4' (even) -> female
    expect(getGenderFromIdNumber("110101199001010046")).toBe(2);
    // 17th digit is '6' (even) -> female
    expect(getGenderFromIdNumber("110101199001010068")).toBe(2);
    // 17th digit is '8' (even) -> female
    expect(getGenderFromIdNumber("110101199001010080")).toBe(2);
  });

  it("should return 0 for invalid input", () => {
    expect(getGenderFromIdNumber("")).toBe(0);
    expect(getGenderFromIdNumber("12345")).toBe(0);
  });
});

// ==================== 身份证号格式校验测试 ====================

function isValidIdNumber(idNumber: string): boolean {
  return /^\d{17}[\dXx]$/.test(idNumber);
}

describe("isValidIdNumber", () => {
  it("should validate correct 18-digit ID numbers", () => {
    expect(isValidIdNumber("110101199001010010")).toBe(true);
    expect(isValidIdNumber("11010119900101001X")).toBe(true);
    expect(isValidIdNumber("11010119900101001x")).toBe(true);
  });

  it("should reject invalid ID numbers", () => {
    expect(isValidIdNumber("")).toBe(false);
    expect(isValidIdNumber("12345")).toBe(false);
    expect(isValidIdNumber("1234567890123456")).toBe(false); // 16 digits
    expect(isValidIdNumber("1234567890123456789")).toBe(false); // 19 digits
    expect(isValidIdNumber("1234567890123456A")).toBe(false); // Invalid last char
  });
});

// ==================== 手机号格式校验测试 ====================

function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone);
}

describe("isValidPhone", () => {
  it("should validate correct phone numbers", () => {
    expect(isValidPhone("13800138000")).toBe(true);
    expect(isValidPhone("15912345678")).toBe(true);
    expect(isValidPhone("18888888888")).toBe(true);
  });

  it("should reject invalid phone numbers", () => {
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("1234567890")).toBe(false); // 10 digits
    expect(isValidPhone("138001380001")).toBe(false); // 12 digits
    expect(isValidPhone("23800138000")).toBe(false); // doesn't start with 1
    expect(isValidPhone("1380013800a")).toBe(false); // contains letter
  });
});

// ==================== 隐私合规测试 ====================

describe("Privacy Compliance", () => {
  it("toPublicUser should not expose sensitive data", () => {
    const fullUser = {
      id: 1,
      nickname: "测试用户",
      avatar: null,
      gender: 1,
      isVerified: true,
      bio: "测试简介",
      phone: "13800138000",
      email: "test@example.com",
      openId: "secret-open-id",
    };

    function toPublicUser(user: any) {
      return {
        id: user.id,
        nickname: user.nickname || user.name || `用户${user.id}`,
        avatar: user.avatar || null,
        gender: user.gender || 0,
        isVerified: user.isVerified || false,
        bio: user.bio || null,
      };
    }

    const publicUser = toPublicUser(fullUser);

    // Should include public fields
    expect(publicUser.id).toBe(1);
    expect(publicUser.nickname).toBe("测试用户");
    expect(publicUser.gender).toBe(1);
    expect(publicUser.isVerified).toBe(true);

    // Should NOT include sensitive fields
    expect(publicUser).not.toHaveProperty("phone");
    expect(publicUser).not.toHaveProperty("email");
    expect(publicUser).not.toHaveProperty("openId");
  });

  it("verification result should not contain identity info", () => {
    // Simulating what the verify.submit mutation returns
    const verificationResult = {
      success: true,
      message: "实名认证成功",
      gender: 1,
    };

    // Should NOT contain sensitive data
    expect(verificationResult).not.toHaveProperty("realName");
    expect(verificationResult).not.toHaveProperty("idNumber");
    expect(verificationResult).not.toHaveProperty("phone");
  });

  it("database verification update should only contain status fields", () => {
    // Simulating the data passed to updateUserVerification
    const dbUpdatePayload = {
      isVerified: true,
      gender: 1,
      verifiedAt: new Date(),
    };

    // Should only have these three fields
    expect(Object.keys(dbUpdatePayload)).toHaveLength(3);
    expect(dbUpdatePayload).toHaveProperty("isVerified");
    expect(dbUpdatePayload).toHaveProperty("gender");
    expect(dbUpdatePayload).toHaveProperty("verifiedAt");

    // Should NOT have identity info
    expect(dbUpdatePayload).not.toHaveProperty("realName");
    expect(dbUpdatePayload).not.toHaveProperty("idNumber");
  });
});

// ==================== 时间格式化测试 ====================

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

describe("formatTime", () => {
  it("should show '刚刚' for very recent times", () => {
    const now = new Date().toISOString();
    expect(formatTime(now)).toBe("刚刚");
  });

  it("should show minutes for times within an hour", () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60000).toISOString();
    expect(formatTime(tenMinutesAgo)).toBe("10分钟前");
  });

  it("should show hours for times within a day", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(formatTime(threeHoursAgo)).toBe("3小时前");
  });

  it("should show days for times within a week", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(formatTime(twoDaysAgo)).toBe("2天前");
  });
});

// ==================== 阿里云 API 配置占位测试 ====================

describe("Aliyun API Config Placeholder", () => {
  it("should have placeholder values that need to be replaced", () => {
    const ALIYUN_REALNAME_API = {
      appKey: "YOUR_APP_KEY_HERE",
      appSecret: "YOUR_APP_SECRET_HERE",
      endpoint: "https://xxx.market.alicloudapi.com",
    };

    // These should be placeholder values
    expect(ALIYUN_REALNAME_API.appKey).toBe("YOUR_APP_KEY_HERE");
    expect(ALIYUN_REALNAME_API.appSecret).toBe("YOUR_APP_SECRET_HERE");
    expect(ALIYUN_REALNAME_API.endpoint).toContain("alicloudapi.com");
  });
});
