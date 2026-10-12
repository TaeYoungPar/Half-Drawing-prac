function createExportCanvas(canvas: HTMLCanvasElement | null): HTMLCanvasElement | null {
    if (!canvas) {
        return null;
    }

    const exportCanvas =
        document.createElement("canvas");

    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;

    const context =
        exportCanvas.getContext("2d");

    if (!context) {
        return null;
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

    return exportCanvas;
}

export function downloadCanvasImage(canvas: HTMLCanvasElement | null) {
    const exportCanvas = createExportCanvas(canvas);
    if (!exportCanvas) return;

    const imageUrl =
        exportCanvas.toDataURL("image/png");

    const link = document.createElement("a");

    link.href = imageUrl;
    link.download = "half-drawing.png";
    link.click();
}

export async function shareCanvasImage(canvas: HTMLCanvasElement | null): Promise<string | null> {
    const exportCanvas = createExportCanvas(canvas);
    if (!exportCanvas) throw new Error("그림을 준비하지 못했습니다. 다시 시도해주세요.");
    const blob = await new Promise<Blob>((resolve, reject) => {
        exportCanvas.toBlob((value) => value ? resolve(value) : reject(new Error("이미지를 만들지 못했습니다.")), "image/png");
    });
    const file = new File([blob], "half-drawing.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: "함께 완성한 반쪽그림" });
            return "그림을 공유했습니다.";
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") return null;
            throw new Error("공유하지 못했습니다. PNG 저장 버튼으로 저장해주세요.");
        }
    }
    downloadCanvasImage(canvas);
    return "이미지 공유를 지원하지 않아 PNG 다운로드를 요청했습니다. 브라우저 다운로드 항목을 확인해주세요.";
}
