# 中转站供应商支持

支持任意 OpenAI 兼容的模型中转站/API 代理。

## 功能

- 新建供应商时选择"自定义 / 中转站"
- 支持任意 `base_url`，不限于官方目录 URL
- 一键拉取中转站暴露的全部模型
- 自定义 URL 在列表中用琥珀色标注

## 与上游 OpenFic 的区别

上游 `_resolve_provider_url()` 将用户 URL 替换为官方目录 URL，导致中转站验证失败。

OmniFic 改为：用户 URL 非空时直接使用，为空时从目录获取默认地址。

## 实现

- `backend/app/models/services/model_provider_service.py` — `_resolve_provider_url()`
- `frontend/src/components/provider-id-select.tsx` — "自定义 / 中转站" 选项
- `frontend/src/features/settings/components/connection-form-dialog.tsx` — URL 必填
