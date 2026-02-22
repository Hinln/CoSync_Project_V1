import { z } from "zod";

const envSchema = z.object({
  VITE_APP_ID: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  OAUTH_SERVER_URL: z.string().min(1),
  OWNER_OPEN_ID: z.string().min(1),
  NODE_ENV: z.string().optional(),
  BUILT_IN_FORGE_API_URL: z.string().optional(),
  BUILT_IN_FORGE_API_KEY: z.string().optional(),
  ALIYUN_ACCESS_KEY: z.string().min(1),
  ALIYUN_ACCESS_SECRET: z.string().min(1),
  ALIYUN_SCENE_ID: z.string().min(1),
  ALIYUN_REGION: z.string().optional(),
  VERIFY_RETURN_URL: z.string().min(1),
  SMS_ACCESS_KEY_ID: z.string().min(1),
  SMS_ACCESS_KEY_SECRET: z.string().min(1),
  SMS_SIGN_NAME: z.string().min(1),
  SMS_TEMPLATE_CODE: z.string().min(1),
});

const parsed = envSchema.parse(process.env);

export const ENV = {
  appId: parsed.VITE_APP_ID,
  cookieSecret: parsed.JWT_SECRET,
  databaseUrl: parsed.DATABASE_URL,
  oAuthServerUrl: parsed.OAUTH_SERVER_URL,
  ownerOpenId: parsed.OWNER_OPEN_ID,
  isProduction: parsed.NODE_ENV === "production",
  forgeApiUrl: parsed.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: parsed.BUILT_IN_FORGE_API_KEY ?? "",
  aliYunAccessKey: parsed.ALIYUN_ACCESS_KEY,
  aliYunAccessSecret: parsed.ALIYUN_ACCESS_SECRET,
  aliYunSceneId: parsed.ALIYUN_SCENE_ID,
  aliYunRegion: parsed.ALIYUN_REGION || "ap-southeast-1",
  verifyReturnUrl: parsed.VERIFY_RETURN_URL,
  smsAccessKeyId: parsed.SMS_ACCESS_KEY_ID,
  smsAccessKeySecret: parsed.SMS_ACCESS_KEY_SECRET,
  smsSignName: parsed.SMS_SIGN_NAME,
  smsTemplateCode: parsed.SMS_TEMPLATE_CODE,
  ossRegion: process.env.OSS_REGION || "oss-cn-hangzhou",
  ossBucket: process.env.OSS_BUCKET,
  ossAccessKeyId: process.env.OSS_ACCESS_KEY_ID,
  ossAccessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
};
