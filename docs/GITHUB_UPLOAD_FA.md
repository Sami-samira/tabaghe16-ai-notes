# راهنمای بارگذاری پروژه در GitHub با PowerShell

## ۱. ساخت Repository

در GitHub یک Repository خالی با نام پیشنهادی زیر بسازید:

```text
tabaghe16-ai-notes
```

برای شروع، گزینهٔ **Private** امن‌تر است. هنگام ساخت Repository، گزینه‌های README، `.gitignore` و License را فعال نکنید؛ این فایل‌ها از قبل در پروژه وجود دارند.

## ۲. استخراج ZIP

فایل ZIP تحویلی را مثلاً در این مسیر استخراج کنید:

```text
D:\Project24\tabaghe16-ai-notes
```

## ۳. بررسی نبودن کلید و فایل خصوصی

در PowerShell اجرا کنید:

```powershell
$Project = "D:\Project24\tabaghe16-ai-notes"
Set-Location -LiteralPath $Project

Get-ChildItem -Recurse -Force -File |
    Where-Object {
        $_.Name -match "^\.env($|\.)" -or
        $_.Extension -in ".mp3", ".wav", ".m4a", ".gguf", ".safetensors"
    } |
    Select-Object FullName
```

فقط `.env.example` مجاز است. اگر فایل خصوصی دیگری نمایش داده شد، آن را پیش از Git حذف یا از پوشه خارج کنید.

## ۴. ایجاد Commit اولیه

### روش خودکار

در پوشهٔ پروژه این فایل را اجرا کنید و آدرس Repository خالی را بدهید:

```powershell
.\push_to_github.ps1
```

این اسکریپت پیش از Commit وجود کلید، صوت و فایل مدل را بررسی می‌کند.

### روش دستی

```powershell
git init
git branch -M main
git add .
git status --short
git commit -m "Initial release: Tabaghe 16 AI podcast notes"
```

در خروجی `git status --short` نباید فایل صوتی، `.env.local`، خروجی تحلیل، مدل یا محیط مجازی دیده شود.

## ۵. اتصال به GitHub و Push

به‌جای `YOUR_USERNAME` نام کاربری GitHub خود را بگذارید:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/tabaghe16-ai-notes.git
git push -u origin main
```

اگر قبلاً remote با نام `origin` ساخته‌اید:

```powershell
git remote set-url origin https://github.com/YOUR_USERNAME/tabaghe16-ai-notes.git
git push -u origin main
```

## ۶. روش ساده بدون دستور Git

در صفحهٔ Repository خالی GitHub روی **uploading an existing file** بزنید، محتوای پوشهٔ استخراج‌شده را انتخاب کنید و Commit را انجام دهید. برای پروژه‌های کدنویسی، روش Git بالا مطمئن‌تر است و تاریخچهٔ تغییرات را بهتر نگه می‌دارد.

## نکتهٔ استقرار

این پروژه Route سمت سرور دارد و با GitHub Pages اجرا نمی‌شود. قرار دادن آن در GitHub برای نگهداری و نسخه‌بندی سورس است؛ استقرار آنلاین باید روی ChatGPT Sites، Cloudflare Workers یا میزبان سازگار انجام شود.
