#!/bin/bash
# Bu dosya bash ile çalışacak, zsh hatalarından etkilenmez!

echo "🔍 BRIEFPILOT ANALİZ BAŞLIYOR..."

# Büyük dosyaları bul
echo "🔴 >500 satırlık dosyalar:"
find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec wc -l {} \; | sort -rn | awk '$1>500'

# TODO'ları say
echo "🔧 Toplam Teknik Borç:"
grep -r "TODO" src --include="*.js" | wc -l
