# 🚀 راهنمای استقرار ۲۴ ساعته روی Vercel (Vercel Cloud Deployment Guide)

این پروژه به‌گونه‌ای طراحی شده است که بدون نیاز به سرور ویندوزی یا سیستم خانگی روشن، به صورت **۲۴ ساعته و بدون قطعی (Always-On)** روی پلتفرم **Vercel** اجرا شود.

---

## 🎯 چرا Vercel؟

1. **عبور از تحریم‌ها و بن آی‌پی Gemini (پوشش تحریم افغانستان):**
   درخواست‌های متاتریدر و کاربر ابتدا به سرور ابری Vercel ارسال شده و سپس از طریق آی‌پی‌های معتبر ابری Vercel به Gemini فرستاده می‌شوند.
2. **عدم نیاز به سرور سنگین یا دیتابیس گران‌قیمت:**
   تمام **حافظه بلندمدت (تاریخچه معاملات، لاگ‌ها و تحلیل‌ها)** روی **مرورگر کاربر (IndexedDB / LocalStorage)** ذخیره می‌شود. سرور Vercel سبک (`Stateless`) باقی می‌ماند و بالاترین سرعت پردازش را ارائه می‌دهد.
3. **پشتیبانی از ۳۰ کلید چرخشی Gemini:**
   کلیدهای Gemini در متغیرهای محیطی Vercel ذخیره می‌شوند و امنیت کاملی دارند.

---

## 📋 گام ۱: Push پروژه به GitHub

پروژه را روی اکانت GitHub خود Push کنید:

```bash
git add .
git commit -m "feat: vercel serverless support and browser long term memory"
git push origin main
```

---

## 📋 گام ۲: اتصال به Vercel و تنظیم متغیرهای محیطی

1. وارد حساب کاربری خود در [Vercel.com](https://vercel.com) شوید.
2. بر روی **Add New -> Project** کلیک کنید و مخزن GitHub پروژه را انتخاب کنید.
3. در بخش **Environment Variables**، متغیرهای زیر را تنظیم نمایید:

```env
# کلید اصلی Gemini
GEMINI_API_KEY="AIzaSy..."

# کلیدهای چرخشی Gemini (تا ۳۰ کلید)
GEMINI_API_KEY_01="AIzaSy..."
GEMINI_API_KEY_02="AIzaSy..."
GEMINI_API_KEY_03="AIzaSy..."

# کلید رمز عبور اختصاصی اکسپرت MT5
EA_API_SECRET="smart_ea_secret_key_2026"

# مدل Gemini (پیش‌فرض)
GEMINI_MODEL="gemini-2.5-flash"
```

4. بر روی دکمه **Deploy** کلیک کنید.
5. پس از چند ثانیه، دامنه اختصاصی پروژه شما صادر می‌شود (مثلاً: `https://smart-trading-system.vercel.app`).

---

## 📋 گام ۳: تنظیم اکسپرت MQL5 در متاتریدر ۵

1. متاتریدر ۵ را باز کنید.
2. به مسیر `Tools -> Options -> Expert Advisors` بروید.
3. آدرس سرور Vercel خود را به لیست وب‌ریگوئست‌ها اضافه کنید:
   * `https://smart-trading-system.vercel.app`
4. فایل `SmartTraderEA.mq5` را روی چارت بگذارید و متغیر `InpServerUrl` را برابر آدرس Vercel خود قرار دهید:
   * `InpServerUrl` = `https://smart-trading-system.vercel.app`
   * `InpEaSecret` = `smart_ea_secret_key_2026`

---

## 🧠 حافظه بلندمدت (Browser Long-Term Memory)

* تمام داده‌های معاملات و لاگ‌ها به صورت خودکار در **IndexedDB مرورگر شما** ذخیره می‌شوند.
* اگر سرور Vercel را مجدداً منتشر یا ریست کنید، هیچ‌کدام از داده‌های تاریخی شما پاک نخواهند شد.
