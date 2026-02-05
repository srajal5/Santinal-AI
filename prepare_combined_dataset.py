"""
Merge Violence.v1i.yolov8 + Road Accident.v2i.yolov8 into one YOLO dataset.
Classes: 0 = NonViolence, 1 = Violence, 2 = Accident.
Run from: Santinel AI folder
  python prepare_combined_dataset.py
"""
import shutil
from pathlib import Path

# Paths (run from Santinel AI)
BASE = Path(__file__).resolve().parent
VIOLENCE = BASE / "Violence.v1i.yolov8"
ACCIDENT = BASE / "Road Accident.v2i.yolov8"
OUT = BASE / "combined_violence_accident"

# Prefix to avoid filename clashes
V_PREFIX = "v_"
A_PREFIX = "a_"


def copy_violence(split: str):
    """Copy violence dataset as-is (classes 0, 1)."""
    src_img = VIOLENCE / split / "images"
    src_lbl = VIOLENCE / split / "labels"
    dst_img = OUT / split / "images"
    dst_lbl = OUT / split / "labels"
    dst_img.mkdir(parents=True, exist_ok=True)
    dst_lbl.mkdir(parents=True, exist_ok=True)
    if not src_img.exists():
        return 0
    count = 0
    for img in src_img.glob("*.*"):
        if img.suffix.lower() not in (".jpg", ".jpeg", ".png"):
            continue
        name = img.stem
        lbl = src_lbl / f"{name}.txt"
        shutil.copy2(img, dst_img / f"{V_PREFIX}{img.name}")
        if lbl.exists():
            shutil.copy2(lbl, dst_lbl / f"{V_PREFIX}{name}.txt")
        count += 1
    return count


def copy_accident(split: str):
    """Copy accident dataset; rewrite labels so class 0 -> 2 (Accident)."""
    src_img = ACCIDENT / split / "images"
    src_lbl = ACCIDENT / split / "labels"
    dst_img = OUT / split / "images"
    dst_lbl = OUT / split / "labels"
    dst_img.mkdir(parents=True, exist_ok=True)
    dst_lbl.mkdir(parents=True, exist_ok=True)
    if not src_img.exists():
        return 0
    count = 0
    for img in src_img.glob("*.*"):
        if img.suffix.lower() not in (".jpg", ".jpeg", ".png"):
            continue
        name = img.stem
        lbl = src_lbl / f"{name}.txt"
        shutil.copy2(img, dst_img / f"{A_PREFIX}{img.name}")
        if lbl.exists():
            lines = []
            for line in lbl.read_text(encoding="utf-8").strip().splitlines():
                parts = line.split()
                if len(parts) >= 5:
                    parts[0] = "2"  # Accident = class 2
                    lines.append(" ".join(parts))
            (dst_lbl / f"{A_PREFIX}{name}.txt").write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
        count += 1
    return count


def main():
    print("Combining Violence.v1i.yolov8 + Road Accident.v2i.yolov8")
    print("Output:", OUT)
    if not VIOLENCE.exists():
        raise SystemExit("Missing: Violence.v1i.yolov8")
    if not ACCIDENT.exists():
        raise SystemExit("Missing: Road Accident.v2i.yolov8")

    for split in ("train", "valid"):
        nv = copy_violence(split)
        na = copy_accident(split)
        print(f"  {split}: violence={nv}, accident={na}")

    # data.yaml (absolute path so training works from any cwd)
    out_path = OUT.resolve().as_posix()
    yaml_content = f"""# Combined: Violence (NonViolence, Violence) + Road Accident
path: {out_path}
train: train/images
val: valid/images

nc: 3
names: ['NonViolence', 'Violence', 'Accident']
"""
    (OUT / "data.yaml").write_text(yaml_content, encoding="utf-8")
    print("Wrote", OUT / "data.yaml")
    print("Done. Train with: data=", OUT / "data.yaml", sep="")


if __name__ == "__main__":
    main()
