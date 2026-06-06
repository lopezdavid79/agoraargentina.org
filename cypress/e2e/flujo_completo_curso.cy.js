describe('Prueba de Integración: Flujo Completo de Curso', () => {
    const cursoTest = {
        titulo: 'Curso de Prueba Automatizada',
        descripcion: 'Esta es una descripción generada por el test de Cypress.',
        objetivos: 'Objetivo 1, Objetivo 2',
        temario: 'Clase 1: Introducción, Clase 2: Pruebas',
        modalidad: 'Online',
        duracion: '10 horas',
        alt: 'Imagen descriptiva de prueba automatizada',
        imagenUrl: 'https://via.placeholder.com/400x250?text=Test+Cypress'
    };

    it('Debería crear un curso y permitir su visualización en el dashboard', () => {
        // 1. Visitar la página de creación de curso
        cy.visit('http://localhost:3000/admin/cursos/nuevo');

        // 2. Completar el formulario
        cy.get('input[name="titulo"]').type(cursoTest.titulo);
        cy.get('textarea[name="descripcion"]').type(cursoTest.descripcion);
        cy.get('textarea[name="objetivos"]').type(cursoTest.objetivos);
        cy.get('textarea[name="temario"]').type(cursoTest.temario);
        cy.get('select[name="modalidad"]').select(cursoTest.modalidad);
        cy.get('input[name="duracion"]').type(cursoTest.duracion);
        cy.get('input[name="alt"]').type(cursoTest.alt);
        cy.get('input[name="imagenUrl"]').type(cursoTest.imagenUrl);

        // 3. Enviar el formulario
        cy.get('button[type="submit"]').click();

        // 4. Verificar redirección al dashboard y cambio de pestaña
        cy.url().should('include', '/admin/dashboard');
        cy.get('#cursos-tab').click();

        // 5. Buscar el curso recién creado en la tabla
        cy.contains('td', cursoTest.titulo).should('be.visible');

        // 6. Abrir la Vista Previa del curso específico
        // Buscamos el botón de vista previa que está en la misma fila que nuestro título
        cy.contains('tr', cursoTest.titulo).find('.btn-preview').click();

        // 7. Verificar que el Modal cargó los datos correctos (Prueba de atributos data-*)
        cy.get('#previewModal').should('be.visible');
        cy.get('#prev-titulo').should('have.text', cursoTest.titulo);
        cy.get('#prev-modalidad').should('have.text', cursoTest.modalidad);
        
        // 8. Verificar la Accesibilidad (Atributo ALT de la imagen)
        cy.get('#prev-imagen')
            .should('have.attr', 'src', cursoTest.imagenUrl)
            .and('have.attr', 'alt', cursoTest.alt);

        // 9. Cerrar el modal para finalizar la prueba
        cy.get('#previewModal .btn-close').click();
    });
});