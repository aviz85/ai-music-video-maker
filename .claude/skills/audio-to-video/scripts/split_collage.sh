#!/bin/bash
# Split a 3x3 collage image into 9 separate images

INPUT="$1"
OUTPUT_DIR="$2"

if [ -z "$INPUT" ] || [ -z "$OUTPUT_DIR" ]; then
    echo "Usage: split_collage.sh <input_image> <output_dir>"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Get image dimensions
WIDTH=$(identify -format "%w" "$INPUT")
HEIGHT=$(identify -format "%h" "$INPUT")

# Calculate cell dimensions (3x3 grid)
CELL_W=$((WIDTH / 3))
CELL_H=$((HEIGHT / 3))

echo "Input: $INPUT (${WIDTH}x${HEIGHT})"
echo "Cell size: ${CELL_W}x${CELL_H}"
echo "Output: $OUTPUT_DIR"

# Extract each cell
# Row 1
convert "$INPUT" -crop ${CELL_W}x${CELL_H}+0+0 +repage "$OUTPUT_DIR/angle_1.jpg"
convert "$INPUT" -crop ${CELL_W}x${CELL_H}+${CELL_W}+0 +repage "$OUTPUT_DIR/angle_2.jpg"
convert "$INPUT" -crop ${CELL_W}x${CELL_H}+$((CELL_W * 2))+0 +repage "$OUTPUT_DIR/angle_3.jpg"

# Row 2
convert "$INPUT" -crop ${CELL_W}x${CELL_H}+0+${CELL_H} +repage "$OUTPUT_DIR/angle_4.jpg"
convert "$INPUT" -crop ${CELL_W}x${CELL_H}+${CELL_W}+${CELL_H} +repage "$OUTPUT_DIR/angle_5.jpg"
convert "$INPUT" -crop ${CELL_W}x${CELL_H}+$((CELL_W * 2))+${CELL_H} +repage "$OUTPUT_DIR/angle_6.jpg"

# Row 3
convert "$INPUT" -crop ${CELL_W}x${CELL_H}+0+$((CELL_H * 2)) +repage "$OUTPUT_DIR/angle_7.jpg"
convert "$INPUT" -crop ${CELL_W}x${CELL_H}+${CELL_W}+$((CELL_H * 2)) +repage "$OUTPUT_DIR/angle_8.jpg"
convert "$INPUT" -crop ${CELL_W}x${CELL_H}+$((CELL_W * 2))+$((CELL_H * 2)) +repage "$OUTPUT_DIR/angle_9.jpg"

echo "Created 9 angle images:"
ls -la "$OUTPUT_DIR"/angle_*.jpg
