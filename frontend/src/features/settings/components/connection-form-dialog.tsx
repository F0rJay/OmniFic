import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, Flex, Button, Text, TextField, Box } from "@radix-ui/themes";
import { Check, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { ProviderIdSelect, Spinner } from "@/components";
import type { ModelProvider, ModelProviderCatalogProvider } from "@/lib/model.types";

import { validateProvider } from "../lib/model-api";
import { ProviderIcon } from "../lib/provider-icons";
import { getProviderUrl, isOfficialUrl } from "../lib/provider-utils";

const connectionSchema = z.object({
  name: z.string().optional(),
  url: z.string().min(1, "urlRequired"),
  apiKey: z.string().optional(),
  providerType: z.string().min(1, "providerTypeRequired"),
});

type ConnectionFormData = z.infer<typeof connectionSchema>;

interface ConnectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection?: ModelProvider;
  catalogProviders?: ModelProviderCatalogProvider[];
  isCatalogLoading?: boolean;
  onSubmit: (data: FormData) => Promise<void>;
  isSubmitting: boolean;
  isAgentSettingsLocked: boolean;
}

export function ConnectionFormDialog({
  open,
  onOpenChange,
  connection,
  catalogProviders,
  isCatalogLoading = false,
  onSubmit,
  isSubmitting,
  isAgentSettingsLocked,
}: ConnectionFormDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!connection;

  const [validationStatus, setValidationStatus] = useState<
    "idle" | "validating" | "success" | "error"
  >("idle");

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    reset,
    setValue,
  } = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionSchema),
    values: connection
      ? {
          name: connection.name || "",
          url: connection.url || "",
          apiKey: "",
          providerType: connection.providerType || "",
        }
      : {
          name: "",
          url: "",
          apiKey: "",
          providerType: "",
        },
  });

  const providerType = useWatch({ control, name: "providerType" });
  const url = useWatch({ control, name: "url" });
  const apiKey = useWatch({ control, name: "apiKey" });
  const selectedCatalogProvider = useMemo(
    () => catalogProviders?.find((provider) => provider.providerType === providerType),
    [catalogProviders, providerType],
  );

  // 统一的 URL 预填逻辑：切换 provider 类型时，仅在用户未自定义 URL 时更新
  const prevProviderTypeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const prevType = prevProviderTypeRef.current;
    prevProviderTypeRef.current = providerType;
    if (!providerType) return;

    const newOfficial = getProviderUrl(providerType, catalogProviders);

    if (providerType === "openai-compatible") {
      // OpenAI 兼容模式没有官方地址，清空（仅在用户未自定义时）
      const prevOfficial =
        prevType && prevType !== "openai-compatible"
          ? getProviderUrl(prevType, catalogProviders)
          : null;
      if (!url || url === prevOfficial) {
        setValue("url", "");
      }
      return;
    }

    // 已知 provider：仅在 URL 为空或等于上一个 provider 的官方地址时更新
    const prevOfficial =
      prevType && prevType !== "openai-compatible"
        ? getProviderUrl(prevType, catalogProviders)
        : null;

    if (newOfficial && (!url || url === prevOfficial)) {
      setValue("url", newOfficial);
    }
  }, [providerType, setValue, url, catalogProviders]);

  // 验证连接
  const handleValidate = useCallback(async () => {
    const formData = getValues();

    if (!formData.providerType || !formData.url?.trim()) {
      return;
    }

    // 如果没有apiKey且是新建模式，显示错误
    if (!isEditing && !formData.apiKey) {
      setValidationStatus("error");
      return;
    }

    setValidationStatus("validating");

    try {
      // 通过后端验证连接（后端会访问 URL/models 接口）
      const result = await validateProvider({
        provider_type: formData.providerType,
        url: formData.url,
        api_key: formData.apiKey || "", // 编辑时可以为空
      });

      if (result.success) {
        setValidationStatus("success");
      } else {
        setValidationStatus("error");
      }
    } catch {
      setValidationStatus("error");
    }
  }, [getValues, isEditing]);

  // 提交表单
  const onFormSubmit = useCallback(
    async (data: ConnectionFormData) => {
      const formData = new FormData();

      formData.append("name", data.name || "");
      formData.append("url", data.url!.trim());
      formData.append("provider_type", data.providerType);

      // 只有在提供了 API Key 时才包含它
      if (data.apiKey) {
        formData.append("api_key", data.apiKey);
      }

      await onSubmit(formData);
      reset();
      setValidationStatus("idle");
    },
    [onSubmit, reset],
  );

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setValidationStatus("idle");
      }
      onOpenChange(newOpen);
    },
    [onOpenChange],
  );

  const canValidate = useMemo(() => {
    if (!providerType) return false;
    if (!url || !url.trim()) return false;
    if (!isEditing && !apiKey) return false;
    return true;
  }, [providerType, url, isEditing, apiKey]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={handleOpenChange}
    >
      <Dialog.Content maxWidth="500px">
        <Dialog.Title>
          {isEditing ? t("connections.editConnection") : t("connections.createConnection")}
        </Dialog.Title>

        <form onSubmit={handleSubmit(onFormSubmit)}>
          <Flex
            direction="column"
            gap="4"
            mt="4"
          >
            {/* 第一行：目录图标和基本信息 */}
            <Flex
              gap="3"
              align="center"
            >
              <Box
                style={{
                  width: 80,
                  height: 80,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--radius-2)",
                  background: "var(--gray-a3)",
                }}
              >
                <ProviderIcon
                  iconPath={selectedCatalogProvider?.iconPath || connection?.iconPath}
                  size={40}
                />
              </Box>

              {/* 右侧：备注名称和提供商类型 */}
              <Flex
                direction="column"
                gap="3"
                style={{ flex: 1 }}
              >
                {/* 备注名称 */}
                <Flex
                  direction="column"
                  gap="2"
                >
                  <Text
                    size="2"
                    weight="medium"
                    color="gray"
                  >
                    {t("connections.name")}
                  </Text>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <TextField.Root
                        {...field}
                        placeholder={t("connections.namePlaceholder")}
                        disabled={isAgentSettingsLocked}
                      />
                    )}
                  />
                </Flex>

                {/* 提供商类型 */}
                <Flex
                  direction="column"
                  gap="2"
                >
                  <Text
                    size="2"
                    weight="medium"
                    color="gray"
                  >
                    {t("connections.providerType")}{" "}
                    <Text
                      color="red"
                      style={{ display: "inline" }}
                    >
                      *
                    </Text>
                  </Text>
                  <Controller
                    name="providerType"
                    control={control}
                    render={({ field }) => (
                      <ProviderIdSelect
                        value={field.value}
                        onChange={field.onChange}
                        providers={catalogProviders ?? []}
                        placeholder={t("connections.providerTypePlaceholder")}
                        disabled={isAgentSettingsLocked || isEditing}
                      />
                    )}
                  />
                  {errors.providerType && (
                    <Text
                      size="1"
                      color="red"
                    >
                      {t(`connections.${errors.providerType.message}`)}
                    </Text>
                  )}
                  {!isEditing && isCatalogLoading && (
                    <Text
                      size="1"
                      color="gray"
                    >
                      {t("connections.catalogLoading")}
                    </Text>
                  )}
                </Flex>
              </Flex>
            </Flex>

            {/* 服务 URL — 对所有提供商类型显示，默认预填官方地址 */}
            <Flex
              direction="column"
              gap="2"
            >
              <Text
                size="2"
                weight="medium"
                color="gray"
              >
                {t("connections.url")}{" "}
                <Text
                  color="red"
                  style={{ display: "inline" }}
                >
                  *
                </Text>
              </Text>
              <Controller
                name="url"
                control={control}
                render={({ field }) => (
                  <TextField.Root
                    {...field}
                    placeholder={t("connections.urlPlaceholder")}
                    disabled={isAgentSettingsLocked}
                  />
                )}
              />
              {providerType && providerType !== "openai-compatible" && (
                <Text
                  size="1"
                  color="gray"
                >
                  {isOfficialUrl(providerType, url, catalogProviders)
                    ? t("connections.urlHint")
                    : t("connections.urlRelayHint")}
                </Text>
              )}
              {errors.url && (
                <Text
                  size="1"
                  color="red"
                >
                  {t(`connections.${errors.url.message}`)}
                </Text>
              )}
            </Flex>

            {/* API Key */}
            <Flex
              direction="column"
              gap="2"
            >
              <Text
                size="2"
                weight="medium"
                color="gray"
              >
                {t("connections.apiKey")}
                {!isEditing && (
                  <Text
                    color="red"
                    style={{ display: "inline" }}
                  >
                    {" "}
                    *
                  </Text>
                )}
              </Text>
              {isEditing ? (
                <Box>
                  <TextField.Root
                    value={apiKey || ""}
                    onChange={(e) => {
                      const form = getValues();
                      reset({
                        ...form,
                        apiKey: e.target.value,
                      });
                    }}
                    type="password"
                    placeholder={
                      apiKey ? t("connections.apiKeyPlaceholderEdit") : "••••••••••••••••"
                    }
                    disabled={isAgentSettingsLocked}
                  />
                  <Text
                    size="1"
                    color="gray"
                    mt="1"
                  >
                    {t("connections.apiKeyEditHint")}
                  </Text>
                </Box>
              ) : (
                <Controller
                  name="apiKey"
                  control={control}
                  render={({ field }) => (
                    <TextField.Root
                      {...field}
                      type="password"
                      placeholder={t("connections.apiKeyPlaceholder")}
                      disabled={isAgentSettingsLocked}
                    />
                  )}
                />
              )}
              {errors.apiKey && (
                <Text
                  size="1"
                  color="red"
                >
                  {t(`connections.${errors.apiKey.message}`)}
                </Text>
              )}
            </Flex>

            {/* 操作按钮 */}
            <Flex
              gap="3"
              mt="2"
              justify="between"
            >
              <Button
                type="button"
                variant="soft"
                onClick={handleValidate}
                disabled={
                  isAgentSettingsLocked || !canValidate || validationStatus === "validating"
                }
                style={{
                  backgroundColor:
                    validationStatus === "success"
                      ? "var(--green-a3)"
                      : validationStatus === "error"
                        ? "var(--red-a3)"
                        : undefined,
                  color:
                    validationStatus === "success"
                      ? "var(--green-11)"
                      : validationStatus === "error"
                        ? "var(--red-11)"
                        : undefined,
                }}
              >
                {validationStatus === "validating" ? <Spinner size={18} /> : null}
                {validationStatus === "success" && <Check size={16} />}
                {validationStatus === "error" && <X size={16} />}
                {validationStatus === "validating"
                  ? t("connections.validating")
                  : validationStatus === "success"
                    ? t("connections.validateSuccess")
                    : validationStatus === "error"
                      ? t("connections.validateFailed")
                      : t("connections.validate")}
              </Button>

              <Flex gap="3">
                <Dialog.Close>
                  <Button
                    type="button"
                    variant="soft"
                    color="gray"
                    disabled={isSubmitting}
                  >
                    {t("common.cancel")}
                  </Button>
                </Dialog.Close>
                <Button
                  type="submit"
                  disabled={
                    isAgentSettingsLocked ||
                    isSubmitting ||
                    (!isEditing && validationStatus !== "success")
                  }
                >
                  {isSubmitting ? <Spinner size={18} /> : null}
                  {isEditing ? t("common.save") : t("common.create")}
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
