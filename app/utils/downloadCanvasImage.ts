export function downloadCanvasImage(
    canvas: HTMLCanvasElement | null
) {
    if (!canvas) {
        return;
    }

    const exportCanvas =
        document.createElement("canvas");

    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;

    const context =
        exportCanvas.getContext("2d");

    if (!context) {
        return;
    }

    // CSS 배경색은 이미지에 포함되지 않으므로
    // 실제 흰색 배경을 먼저 그립니다.
    context.fillStyle = "#ffffff";

    context.fillRect(
        0,
        0,
        exportCanvas.width,
        exportCanvas.height
    );

    context.drawImage(canvas, 0, 0);

    const imageUrl =
        exportCanvas.toDataURL("image/png");

    const link = document.createElement("a");

    link.href = imageUrl;
    link.download = "half-drawing.png";
    link.click();
}