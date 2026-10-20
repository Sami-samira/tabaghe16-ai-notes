$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git نصب نیست یا در PATH قرار ندارد. ابتدا Git for Windows را نصب کنید."
}

$ForbiddenFiles = Get-ChildItem -LiteralPath $ProjectRoot -Recurse -Force -File |
    Where-Object {
        $_.FullName -notmatch "[\\/](\.git|node_modules|dist)[\\/]" -and (
            $_.Name -match "^\.env($|\.)" -and $_.Name -ne ".env.example" -or
            $_.Extension -in ".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".gguf", ".safetensors", ".onnx", ".pt", ".pth", ".ckpt"
        )
    }

if ($ForbiddenFiles) {
    $ForbiddenFiles | Select-Object FullName | Format-Table -AutoSize
    throw "فایل خصوصی یا سنگین در پوشه پیدا شد. قبل از ادامه آن را خارج کنید."
}

$RepositoryUrl = Read-Host "آدرس Repository خالی GitHub را وارد کنید"
$RepositoryUrl = $RepositoryUrl.Trim().Trim('"')

if ($RepositoryUrl -notmatch "^https://github\.com/[^/]+/[^/]+(?:\.git)?$") {
    throw "آدرس GitHub معتبر نیست. نمونه: https://github.com/USERNAME/tabaghe16-ai-notes.git"
}

if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot ".git"))) {
    git init
}

git branch -M main
git add .

$Staged = git diff --cached --name-only
if (-not $Staged) {
    Write-Host "تغییر جدیدی برای Commit وجود ندارد."
} else {
    git commit -m "Initial release: Tabaghe 16 AI podcast notes"
}

$ExistingOrigin = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0 -and $ExistingOrigin) {
    git remote set-url origin $RepositoryUrl
} else {
    git remote add origin $RepositoryUrl
}

git push -u origin main
Write-Host "پروژه با موفقیت به GitHub ارسال شد."
