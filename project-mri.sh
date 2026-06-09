#!/bin/zsh
echo "🔍 BRIEFPILOT PROJE MR RAPORU"
echo "============================"
echo "Tarih: $(date)"
echo ""

echo "📊 KOD METRİKLERİ:"
echo "• JS/TS dosyası: $(find src -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) | wc -l | xargs)"
echo "• Toplam LOC: $(find src -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec cat {} \; | wc -l | xargs)"
echo ""

echo "🔴 EN BÜYÜK 5 DOSYA (Refactor Adayı):"
find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec wc -l {} \; | sort -rn | head -5 | while read line; do
  echo "  $line"
done
echo ""

echo "📦 EN ÇOK IMPORT EDILEN MODÜLLER:"
grep -rh "^import.*from " src --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" | \
  sed "s/.*from ['\"]//; s/['\"].*//" | sort | uniq -c | sort -rn | head -10 | while read count mod; do
  echo "  $count × $mod"
done
echo ""

echo "🔧 TEKNİK BORÇ (TODO/FIXME):"
todo_count=$(grep -rn "TODO\|FIXME" src --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" | wc -l | xargs)
echo "• Toplam: $todo_count"
grep -rn "TODO\|FIXME" src --include="*.js" --include="*.jsx" | head -3 | sed 's/^/  /'
echo ""

echo "⚠️ CONSOLE.LOG KALINTILARI:"
console_count=$(grep -rn "console\.log\|console\.warn" src --include="*.js" --include="*.jsx" | wc -l | xargs)
echo "• Toplam: $console_count"
echo ""

echo "💾 SRC KLASÖR BÜYÜKLÜKLERİ:"
du -sh src/* 2>/dev/null | sort -rh | head -8 | sed 's/^/  /'
echo ""
echo "✅ MR TAMAMLANDI."
