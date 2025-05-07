/**
 * Archivo principal que maneja la lógica de la aplicación
 */

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const certificateForm = document.getElementById('certificate-form');
    const previewBtn = document.getElementById('preview-btn');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    const navGenerator = document.getElementById('nav-generator');
    const navHistory = document.getElementById('nav-history');
    const generatorSection = document.getElementById('generator-section');
    const historySection = document.getElementById('history-section');
    const logoUpload = document.getElementById('logo-upload');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const historyTableBody = document.getElementById('history-table-body');
    const noRecords = document.getElementById('no-records');
    const previewContainer = document.getElementById('preview-container');
    const pdfContainer = document.getElementById('pdf-container');
    const pdfIframe = document.getElementById('pdf-iframe');
    
    // Variables para almacenar datos temporales
    let currentCertificateData = null;
    let currentPdfDataUrl = null;
    let logoDataUrl = null;
    
    // Modal de carga
    const loadingModal = new bootstrap.Modal(document.getElementById('loading-modal'));
    
    /**
     * Muestra una notificación toast
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de notificación (success, danger, warning, info)
     */
    const showToast = (message, type = 'success') => {
        const toastContainer = document.getElementById('toast-container');
        const toastId = `toast-${Date.now()}`;
        
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
        toast.show();
        
        // Eliminar el toast del DOM después de ocultarse
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    };
    
    /**
     * Actualiza la vista previa del certificado con los datos del formulario
     */
    const updatePreview = () => {
        const eventName = document.getElementById('event-name').value;
        const eventDate = document.getElementById('event-date').value;
        const eventLocation = document.getElementById('event-location').value;
        const participantName = document.getElementById('participant-name').value;
        const participantRole = document.getElementById('participant-role').value;
        const eventDuration = document.getElementById('event-duration').value;
        
        document.getElementById('preview-event').textContent = eventName || 'Nombre del Evento';
        document.getElementById('preview-date').textContent = eventDate ? formatDate(eventDate) : 'Fecha';
        document.getElementById('preview-location').textContent = eventLocation || 'Lugar';
        document.getElementById('preview-participant').textContent = participantName || 'Nombre del Participante';
        document.getElementById('preview-role').textContent = participantRole || 'Rol';
        document.getElementById('preview-duration').textContent = eventDuration || '0';
        
        // Generar ID único de certificado si no existe
        const certificateId = document.getElementById('preview-certificate-id');
        if (certificateId.textContent === 'ID: 000000') {
            certificateId.textContent = `ID: ${Storage.generateCertificateId()}`;
        }
        
        // Mostrar el logo si se ha seleccionado
        const logoPreview = document.getElementById('preview-logo').querySelector('img');
        if (logoDataUrl) {
            logoPreview.src = logoDataUrl;
        } else {
            logoPreview.src = 'assets/default-logo.png';
        }
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
     * Recopila los datos del formulario
     * @returns {Object} - Datos del certificado
     */
    const collectFormData = () => {
        const certId = document.getElementById('preview-certificate-id').textContent.replace('ID: ', '');
        
        return {
            id: certId,
            eventName: document.getElementById('event-name').value,
            eventDate: document.getElementById('event-date').value,
            eventLocation: document.getElementById('event-location').value,
            participantName: document.getElementById('participant-name').value,
            participantRole: document.getElementById('participant-role').value,
            eventDuration: document.getElementById('event-duration').value
        };
    };
    
    /**
     * Valida el formulario
     * @returns {boolean} - True si el formulario es válido
     */
    const validateForm = () => {
        const requiredFields = [
            'event-name',
            'event-date',
            'event-location',
            'participant-name',
            'participant-role',
            'event-duration'
        ];
        
        let isValid = true;
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });
        
        return isValid;
    };
    
    /**
     * Genera el PDF del certificado
     */
    const generatePDF = async () => {
        try {
            if (!validateForm()) {
                showToast('Por favor, complete todos los campos obligatorios.', 'danger');
                return;
            }
            
            loadingModal.show();
            
            // Recopilar datos del formulario
            currentCertificateData = collectFormData();
            
            // Generar el PDF
            currentPdfDataUrl = await PDFGenerator.generateCertificatePDF(
                currentCertificateData,
                logoDataUrl
            );
            
            // Mostrar el PDF generado
            pdfIframe.src = currentPdfDataUrl;
            previewContainer.classList.add('d-none');
            pdfContainer.classList.remove('d-none');
            
            // Guardar en la base de datos
            await Storage.saveCertificate(currentCertificateData, currentPdfDataUrl);
            
            loadingModal.hide();
            showToast('¡Certificado generado con éxito!');
        } catch (error) {
            loadingModal.hide();
            console.error('Error al generar el PDF:', error);
            showToast('Error al generar el certificado. Inténtelo de nuevo.', 'danger');
        }
    };
    
    /**
     * Carga el historial de certificados
     * @param {string} searchTerm - Término de búsqueda (opcional)
     */
    const loadCertificatesHistory = async (searchTerm = '') => {
        try {
            // Obtener certificados, filtrando por término de búsqueda si existe
            const certificates = await Storage.searchCertificates(searchTerm);
            
            // Limpiar tabla
            historyTableBody.innerHTML = '';
            
            if (certificates.length === 0) {
                noRecords.classList.remove('d-none');
                return;
            }
            
            noRecords.classList.add('d-none');
            
            // Ordenar por fecha de creación descendente (más reciente primero)
            certificates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            // Llenar tabla con datos
            certificates.forEach(cert => {
                const row = document.createElement('tr');
                row.dataset.id = cert.id;
                
                const dateFormatted = new Date(cert.eventDate).toLocaleDateString('es-ES');
                
                row.innerHTML = `
                    <td>${cert.id}</td>
                    <td>${cert.participantName}</td>
                    <td>${cert.eventName}</td>
                    <td>${dateFormatted}</td>
                    <td>
                        <i class="fas fa-eye action-btn view" title="Ver"></i>
                        <i class="fas fa-download action-btn download" title="Descargar"></i>
                        <i class="fas fa-trash action-btn delete" title="Eliminar"></i>
                    </td>
                `;
                
                historyTableBody.appendChild(row);
            });
            
            // Añadir eventos a los botones de acción
            addActionButtonsEvents();
        } catch (error) {
            console.error('Error al cargar el historial:', error);
            showToast('Error al cargar el historial de certificados.', 'danger');
        }
    };
    
    /**
     * Añade eventos a los botones de acción en la tabla de historial
     */
    const addActionButtonsEvents = () => {
        // Ver certificado
        document.querySelectorAll('.action-btn.view').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const certId = e.target.closest('tr').dataset.id;
                viewCertificate(certId);
            });
        });
        
        // Descargar certificado
        document.querySelectorAll('.action-btn.download').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const certId = e.target.closest('tr').dataset.id;
                downloadCertificate(certId);
            });
        });
        
        // Eliminar certificado
        document.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const certId = e.target.closest('tr').dataset.id;
                if (confirm('¿Está seguro de que desea eliminar este certificado?')) {
                    deleteCertificate(certId);
                }
            });
        });
        
        // Hacer que toda la fila sea clickeable para ver el certificado
        document.querySelectorAll('#history-table-body tr').forEach(row => {
            row.addEventListener('click', () => {
                viewCertificate(row.dataset.id);
            });
        });
    };
    
    /**
     * Ve un certificado específico
     * @param {string} certId - ID del certificado
     */
    const viewCertificate = async (certId) => {
        try {
            // Cambiar a la vista del generador
            navGenerator.click();
            
            // Obtener certificado de la base de datos
            const certificate = await Storage.getCertificateById(certId);
            if (!certificate) {
                showToast('Certificado no encontrado.', 'warning');
                return;
            }
            
            // Cargar datos en el formulario
            document.getElementById('event-name').value = certificate.eventName;
            document.getElementById('event-date').value = certificate.eventDate;
            document.getElementById('event-location').value = certificate.eventLocation;
            document.getElementById('participant-name').value = certificate.participantName;
            document.getElementById('participant-role').value = certificate.participantRole;
            document.getElementById('event-duration').value = certificate.eventDuration;
            
            // Mostrar el PDF
            pdfIframe.src = certificate.pdfDataUrl;
            previewContainer.classList.add('d-none');
            pdfContainer.classList.remove('d-none');
            
            // Actualizar variables globales
            currentCertificateData = certificate;
            currentPdfDataUrl = certificate.pdfDataUrl;
            
            // Actualizar el ID en la vista previa
            document.getElementById('preview-certificate-id').textContent = `ID: ${certificate.id}`;
            
            showToast('Certificado cargado.');
        } catch (error) {
            console.error('Error al ver el certificado:', error);
            showToast('Error al cargar el certificado.', 'danger');
        }
    };
    
    /**
     * Descarga un certificado específico
     * @param {string} certId - ID del certificado
     */
    const downloadCertificate = async (certId) => {
        try {
            const certificate = await Storage.getCertificateById(certId);
            if (!certificate) {
                showToast('Certificado no encontrado.', 'warning');
                return;
            }
            
            // Crear enlace de descarga
            const link = document.createElement('a');
            link.href = certificate.pdfDataUrl;
            link.download = `Certificado_${certificate.id}.pdf`;
            link.click();
            
            showToast('Descarga iniciada.');
        } catch (error) {
            console.error('Error al descargar el certificado:', error);
            showToast('Error al descargar el certificado.', 'danger');
        }
    };
    
    /**
     * Elimina un certificado específico
     * @param {string} certId - ID del certificado
     */
    const deleteCertificate = async (certId) => {
        try {
            await Storage.deleteCertificate(certId);
            showToast('Certificado eliminado.');
            loadCertificatesHistory(searchInput.value);
        } catch (error) {
            console.error('Error al eliminar el certificado:', error);
            showToast('Error al eliminar el certificado.', 'danger');
        }
    };
    
    // ----- Eventos -----
    
    // Evento para mostrar vista previa
    previewBtn.addEventListener('click', () => {
        updatePreview();
        previewContainer.classList.remove('d-none');
        pdfContainer.classList.add('d-none');
    });
    
    // Evento para generar PDF
    generateBtn.addEventListener('click', generatePDF);
    
    // Evento para descargar el PDF actual
    downloadBtn.addEventListener('click', () => {
        if (currentPdfDataUrl) {
            const link = document.createElement('a');
            link.href = currentPdfDataUrl;
            const certId = currentCertificateData.id;
            link.download = `Certificado_${certId}.pdf`;
            link.click();
        }
    });
    
    // Eventos de navegación
    navGenerator.addEventListener('click', (e) => {
        e.preventDefault();
        historySection.classList.add('d-none');
        generatorSection.classList.remove('d-none');
        navHistory.classList.remove('active');
        navGenerator.classList.add('active');
    });
    
    navHistory.addEventListener('click', (e) => {
        e.preventDefault();
        generatorSection.classList.add('d-none');
        historySection.classList.remove('d-none');
        navGenerator.classList.remove('active');
        navHistory.classList.add('active');
        loadCertificatesHistory();
    });
    
    // Evento para cargar logo
    logoUpload.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const file = e.target.files[0];
                logoDataUrl = await PDFGenerator.fileToDataURL(file);
                updatePreview();
            } catch (error) {
                console.error('Error al cargar el logo:', error);
                showToast('Error al cargar el logo. Verifique el formato de imagen.', 'danger');
            }
        }
    });
    
    // Evento para buscar certificados
    searchBtn.addEventListener('click', () => {
        loadCertificatesHistory(searchInput.value);
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadCertificatesHistory(searchInput.value);
        }
    });
    
    // Inicializar la aplicación
    updatePreview();
});