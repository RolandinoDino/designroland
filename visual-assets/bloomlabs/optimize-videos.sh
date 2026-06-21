#!/usr/bin/env bash
# optimize-videos.sh
# - Autoplay-loop clips  (videos-source/)        -> kept at 4K
# - Hover-preview clips   (videos-hover-source/)  -> downscaled to 1080p for fast load
# Both: muted (audio stripped), web-optimized, with WebM + MP4 + a poster image.
# Usage:    bash optimize-videos.sh
# Requires: ffmpeg  (install on Mac with: brew install ffmpeg)

set -euo pipefail

AUTOPLAY_SRC="video-source"          # <-- 4K autoplay-loop clips go here
HOVER_SRC="videos-hover-source"     # <-- hover-preview clips go here (will become 1080p)
OUT="videos-optimized"              # web-ready files land here
mkdir -p "$OUT"
shopt -s nullglob nocaseglob

# encode <file> <scale-or-empty> <h264-crf> <vp9-crf>
encode () {
  local f="$1" scale="$2" h264crf="$3" vp9crf="$4"
  local name; name="$(basename "${f%.*}")"
  local vf=""
  [ -n "$scale" ] && vf="-vf scale=$scale"   # e.g. scale=-2:1080  (height 1080, width auto/even)
  echo "Encoding $name ..."

  # MP4 (H.264) — universal fallback
  ffmpeg -y -i "$f" -an $vf \
    -c:v libx264 -crf "$h264crf" -preset slow -pix_fmt yuv420p \
    -movflags +faststart "$OUT/$name.mp4"

  # WebM (VP9) — smaller, modern browsers
  ffmpeg -y -i "$f" -an $vf \
    -c:v libvpx-vp9 -b:v 0 -crf "$vp9crf" -row-mt 1 "$OUT/$name.webm"

  # Poster frame (first frame)
  ffmpeg -y -i "$f" $vf -frames:v 1 -q:v 3 "$OUT/$name-poster.jpg"

  echo "  -> $OUT/$name.mp4 , $OUT/$name.webm , $OUT/$name-poster.jpg"
}

# Autoplay loops — native 4K (no scaling)
for f in "$AUTOPLAY_SRC"/*.{mp4,mov,m4v,webm}; do
  encode "$f" "" 24 32
done

# Hover previews — 1080p  (change 1080 to 1440 here for sharper previews)
for f in "$HOVER_SRC"/*.{mp4,mov,m4v,webm}; do
  encode "$f" "-2:1080" 23 31
done

echo "Done. Autoplay clips at 4K, hover clips at 1080p, all in ./$OUT"
