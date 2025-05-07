/**
 * Módulo para la generación de PDFs de certificados
 */

const PDFGenerator = (() => {
    // Accedemos a la biblioteca jsPDF desde el objeto window
    const { jsPDF } = window.jspdf;
    
    /**
     * Convierte una imagen a una URL de datos
     * @param {File} file - Archivo de imagen
     * @returns {Promise<string>} - Promesa que se resuelve con la URL de datos
     */
    const fileToDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };
    
    /**
     * Carga una imagen desde una URL
     * @param {string} url - URL de la imagen
     * @returns {Promise<HTMLImageElement>} - Promesa que se resuelve con el elemento de imagen
     */
    const loadImage = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (error) => reject(error);
            img.src = url;
        });
    };
    
    /**
     * Formatea una fecha como DD/MM/YYYY
     * @param {string} dateString - Fecha en formato YYYY-MM-DD
     * @returns {string} - Fecha formateada
     */
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
    
    /**
     * Genera un texto específico según el rol del participante
     * @param {Object} data - Datos del certificado
     * @returns {string} - Texto personalizado según el rol
     */
    const getRoleSpecificText = (data) => {
        switch (data.participantRole) {
            case 'Ponente':
                return `ha participado como PONENTE en el evento "${data.eventName}", presentando su conocimiento y experiencia durante ${data.eventDuration} horas.`;
            case 'Organizador':
                return `ha participado como ORGANIZADOR en el evento "${data.eventName}", gestionando y coordinando actividades durante ${data.eventDuration} horas.`;
            case 'Asistente':
            default:
                return `ha participado como ASISTENTE en el evento "${data.eventName}", completando satisfactoriamente ${data.eventDuration} horas de formación.`;
        }
    };
    
    /**
     * Genera el PDF del certificado
     * @param {Object} data - Datos del certificado
     * @param {string|null} logoDataUrl - URL de datos del logo (opcional)
     * @returns {Promise<string>} - Promesa que se resuelve con la URL de datos del PDF
     */
    const generateCertificatePDF = async (data, logoDataUrl) => {
        try {
            // Crear un nuevo documento PDF en formato A4 horizontal
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });
            
            // Dimensiones del documento
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Añadir un borde decorativo
            pdf.setDrawColor(0, 110, 253); // Color azul primario de Bootstrap
            pdf.setLineWidth(1);
            pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
            
            // Añadir un borde interno más fino
            pdf.setDrawColor(220, 220, 220);
            pdf.setLineWidth(0.5);
            pdf.rect(15, 15, pageWidth - 30, pageHeight - 30);
            
            // Configurar fuente y tamaño
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(24);
            pdf.setTextColor(0, 110, 253);
            
            // Título del certificado
            pdf.text('CERTIFICADO DE PARTICIPACIÓN', pageWidth / 2, 30, { align: 'center' });
            
            // Procesar y añadir el logo si está disponible
            let logoHeight = 0;
            if (logoDataUrl) {
                try {
                    const logoImg = await loadImage(logoDataUrl);
                    // Calcular dimensiones proporcionales para el logo
                    const maxLogoWidth = 50;
                    const maxLogoHeight = 50;
                    let logoWidth = logoImg.width;
                    logoHeight = logoImg.height;
                    
                    if (logoWidth > maxLogoWidth) {
                        const ratio = maxLogoWidth / logoWidth;
                        logoWidth = maxLogoWidth;
                        logoHeight = logoHeight * ratio;
                    }
                    
                    if (logoHeight > maxLogoHeight) {
                        const ratio = maxLogoHeight / logoHeight;
                        logoHeight = maxLogoHeight;
                        logoWidth = logoWidth * ratio;
                    }
                    
                    // Añadir el logo centrado
                    pdf.addImage(
                        logoDataUrl,
                        'PNG',
                        pageWidth / 2 - logoWidth / 2,
                        40,
                        logoWidth,
                        logoHeight
                    );
                    
                    logoHeight = logoHeight + 10; // Espacio adicional después del logo
                } catch (logoError) {
                    console.error('Error al procesar el logo:', logoError);
                    logoHeight = 0;
                }
            }
            
            // Contenido principal
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(12);
            pdf.setTextColor(0, 0, 0);
            pdf.text('Se certifica que:', pageWidth / 2, 50 + logoHeight, { align: 'center' });
            
            // Nombre del participante
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(18);
            pdf.text(data.participantName, pageWidth / 2, 60 + logoHeight, { align: 'center' });
            
            // Descripción según rol
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(12);
            const roleText = getRoleSpecificText(data);
            
            // Dividir el texto en líneas para que quepa en el ancho del PDF
            const textWidth = pageWidth - 80; // Margen de 40mm a cada lado
            const splitText = pdf.splitTextToSize(roleText, textWidth);
            pdf.text(splitText, pageWidth / 2, 70 + logoHeight, { align: 'center' });
            
            // Calcular la altura del texto dividido
            const textHeight = splitText.length * 5;
            
            // Información adicional
            let yPos = 75 + logoHeight + textHeight;
            pdf.text(`Realizado el ${formatDate(data.eventDate)} en ${data.eventLocation}.`, pageWidth / 2, yPos, { align: 'center' });
            
            // Firma
            yPos += 30;
            pdf.line(pageWidth / 2 - 30, yPos, pageWidth / 2 + 30, yPos);
            yPos += 5;
            pdf.text('Firma del Organizador', pageWidth / 2, yPos, { align: 'center' });
            
            // ID del certificado y fecha de emisión
            yPos += 20;
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            const today = new Date().toLocaleDateString('es-ES');
            pdf.text(`ID: ${data.id} | Fecha de emisión: ${today}`, pageWidth / 2, yPos, { align: 'center' });
            
            // Añadir información de validación
            yPos += 5;
            pdf.text('Este certificado puede ser validado en www.nuestroevento.com/validar', pageWidth / 2, yPos, { align: 'center' });
            
            // Generar el PDF como data URL
            const pdfDataUrl = pdf.output('dataurlstring');
            return pdfDataUrl;
        } catch (error) {
            console.error('Error al generar el PDF:', error);
            throw error;
        }
    };
    
    // API pública
    return {
        generateCertificatePDF,
        fileToDataURL
    };
})();