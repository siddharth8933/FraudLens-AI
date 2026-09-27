from pathlib import Path
from PIL import Image, ImageDraw
from app.services.forensics import analyze_image

def test_forensics(tmp_path):
    p = tmp_path / "test.png"
    img = Image.new("RGB", (500, 300), "white")
    d = ImageDraw.Draw(img)
    d.text((50, 50), "FRAUDLENS TEST DOCUMENT", fill="black")
    img.save(p)
    result = analyze_image(p)
    assert result["image_size"]["width"] == 500
    assert "signals" in result
