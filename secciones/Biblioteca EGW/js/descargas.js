export function createDownloadManager() {
    let activePromise = null;
    async function download(pdfDocument, filename, onProgress = () => {}) {
        if (activePromise) return activePromise;
        activePromise = (async () => {
            onProgress('Preparando descarga…');
            const data = await pdfDocument.getData();
            const blob = new Blob([data], { type: 'application/pdf' });
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
            link.hidden = true;
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
            onProgress('Descarga iniciada');
            return data.byteLength;
        })().catch(error => {
            onProgress(`No se pudo preparar la descarga: ${error.message}`);
            throw error;
        }).finally(() => { activePromise = null; });
        return activePromise;
    }
    return { download };
}
