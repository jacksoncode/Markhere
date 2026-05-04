# 代码签名指南

本指南说明如何为 Markhere 应用配置代码签名，确保用户可以安全安装和运行。

---

## 为什么需要代码签名

| 平台 | 无签名后果 | 签名后效果 |
|------|------------|------------|
| **macOS** | 用户需右键打开，Gatekeeper 警告 | 正常双击打开，无警告 |
| **Windows** | SmartScreen 警告，可能被阻止 | 正常安装，无警告 |
| **Linux** | 无签名要求 | 可验证来源 |

---

## macOS 签名

### 1. 获取开发者证书

#### 申请步骤

1. 加入 **Apple Developer Program** ($99/年)
   - 访问 [developer.apple.com](https://developer.apple.com/programs/)
   - 使用 Apple ID 注册
   - 完成身份验证

2. 创建开发者证书
   ```
   Xcode → Preferences → Accounts → Manage Certificates
   → 点击 "+" → "Developer ID Application"
   ```

3. 导出证书
   - 右键证书 → Export
   - 保存为 `.p12` 文件
   - 设置密码保护

### 2. 配置 GitHub Actions

```yaml
# .github/workflows/release.yml 添加
- name: Import Apple Certificate
  run: |
    # 创建临时密钥链
    security create-keychain -p actions temp-keychain
    security default-keychain -s temp-keychain
    security unlock-keychain -p actions temp-keychain
    
    # 导入证书
    echo ${{ secrets.APPLE_CERTIFICATE_BASE64 }} | base64 -d > certificate.p12
    security import certificate.p12 -k temp-keychain -P ${{ secrets.APPLE_CERTIFICATE_PASSWORD }} -T /usr/bin/codesign
    
    # 清理
    rm certificate.p12

- name: Sign macOS App
  run: |
    codesign --sign "Developer ID Application: YOUR NAME (TEAM_ID)" \
             --deep --force --verify --verbose \
             --options runtime \
             src-tauri/target/*/release/bundle/macos/*.app
```

### 3. 设置 GitHub Secrets

| Secret 名称 | 内容 |
|-------------|------|
| `APPLE_CERTIFICATE_BASE64` | `.p12` 文件的 Base64 编码 |
| `APPLE_CERTIFICATE_PASSWORD` | 证书导出密码 |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

**生成 Base64:**
```bash
base64 -i certificate.p12 | pbcopy
```

### 4.公证 (Notarization)

```yaml
- name: Notarize macOS App
  run: |
    # 上传公证
    xcrun notarytool submit app.dmg \
      --apple-id ${{ secrets.APPLE_ID }} \
      --team-id ${{ secrets.APPLE_TEAM_ID }} \
      --password ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }} \
      --wait
    
    # Staple 公证结果
    xcrun stapler staple app.dmg
```

---

## Windows 筋名

### 1. 获取代码签名证书

#### 证书类型

| 类型 | 价格 | 验证时间 | 适用场景 |
|------|------|----------|----------|
| **Standard** | $100-200/年 | 1-3天 | 个人项目 |
| **EV (Extended Validation)** | $400-600/年 | 1-2周 | 企业项目，即时信任 |

#### 推荐供应商

- [DigiCert](https://www.digicert.com/signing/code-signing-certificates)
- [Sectigo](https://sectigo.com/ssl-certificates-tls/code-signing)
- [GlobalSign](https://www.globalsign.com/en/code-signing-certificate)

### 2. 配置 GitHub Actions

```yaml
# .github/workflows/release.yml 添加
- name: Import Windows Certificate
  run: |
    # 解码证书
    echo ${{ secrets.WINDOWS_CERTIFICATE_BASE64 }} | base64 -d > certificate.pfx
    
- name: Sign Windows Executables
  run: |
    # 签名 MSI
    signtool sign /f certificate.pfx \
                 /p ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }} \
                 /tr http://timestamp.digicert.com \
                 /td sha256 \
                 /fd sha256 \
                 *.msi
    
    # 签名 EXE
    signtool sign /f certificate.pfx \
                 /p ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }} \
                 /tr http://timestamp.digicert.com \
                 /td sha256 \
                 /fd sha256 \
                 *.exe
    
    rm certificate.pfx
```

### 3. 设置 GitHub Secrets

| Secret 名称 | 内容 |
|-------------|------|
| `WINDOWS_CERTIFICATE_BASE64` | `.pfx` 文件的 Base64 编码 |
| `WINDOWS_CERTIFICATE_PASSWORD` | 证书密码 |

---

## 当前状态（未签名）

### v0.1.0 发布说明

> ⚠️ **注意**: 此版本未进行代码签名。
> 
> **macOS 用户**:
> - 首次打开时，右键点击 → 打开 → 确认
> - 或在终端运行: `xattr -cr Markhere.app`
> 
> **Windows 用户**:
> - SmartScreen 会显示警告
> - 点击 "更多信息" → "仍要运行"
> 
> 我们计划在后续版本添加正式签名。

---

## 未来改进计划

### 阶段一：标准签名

| 任务 | 时间 |
|------|------|
| 申请 Apple Developer Program | 1周 |
| 购买 Windows 证书 | 1-3天 |
| 配置 CI/CD 签名流程 | 1周 |
| 测试签名验证 | 1周 |

### 阶段二：公证与 EV 签名

| 任务 | 时间 |
|------|------|
| macOS 公证流程 | 1周 |
| Windows EV 证书升级 | 1-2周 |
| 建立用户信任度 | 持续 |

---

## 验证签名

### macOS

```bash
# 检查签名状态
codesign -dv --verbose=4 Markhere.app

# 检查公证状态
spctl -a -t open -c Markhere.app
```

### Windows

```powershell
# 使用 PowerShell
Get-AuthenticodeSignature Markhere.exe
```

---

## 成本估算

| 项目 | 年度成本 |
|------|----------|
| Apple Developer Program | $99 |
| Windows Standard 证书 | $100-200 |
| Windows EV 证书 | $400-600 |
| **总计 (Standard)** | ~$200-300/年 |
| **总计 (EV)** | ~$500-700/年 |

---

## 参考资源

- [Apple Code Signing Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/)
- [Windows Code Signing Best Practices](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
- [Tauri Code Signing Guide](https://tauri.app/v1/guides/distribution/sign/)
- [GitHub Actions macOS Signing](https://github.com/actions/runner-images#macos)

---

<div align="center">

**代码签名提升用户信任**

</div>