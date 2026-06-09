#!/bin/bash
echo "🩺 BRIEFPILOT KONTROL"
echo "====================="
echo -n "Dosya Sayisi: "
find src -type f \( -name "*.js" -o -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | wc -l
echo -n "Toplam LOC: "
find src -type f \( -name "*.js" -o -name "*.ts" -o -name "*.tsx" \) -exec cat {} \; 2>/dev/null | wc -l
echo ""
echo "🔴 Büyük Dosyalar (>500 satır):"
find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec wc -l {} \; 2>/dev/null | sort -rn | head -10 | grep -v "^[[:space:]]*[0-9][0-9][0-9] "
echo ""
echo "📦 En Çok Import Edilenler (Basit):"
grep -rh "from " src --include="*.js" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "//" | head -20
echo ""
echo "✅ Bitti."
