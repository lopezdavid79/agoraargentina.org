const { generarPdfAccesible } = require('../scripts/pdfGenerator');

describe('generarPdfAccesible', () => {
  let mockPage;
  let mockBrowser;
  let puppeteer;

  beforeEach(async () => {
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.7\nfake tagged pdf content')),
    };
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };
    puppeteer = { launch: jest.fn().mockResolvedValue(mockBrowser) };
  });

  test('llama page.pdf con tagged: true y devuelve un Buffer', async () => {
    const buffer = await generarPdfAccesible('<html><body><h1>Test</h1></body></html>', {}, puppeteer);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(puppeteer.launch).toHaveBeenCalledTimes(1);
    expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);
    expect(mockPage.setContent).toHaveBeenCalledWith('<html><body><h1>Test</h1></body></html>', expect.any(Object));
    expect(mockPage.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ tagged: true, format: 'A4' })
    );
  });

  test('acepta opts con format y landscape', async () => {
    const buffer = await generarPdfAccesible('<html></html>', { format: 'Letter', landscape: true }, puppeteer);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(mockPage.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ tagged: true, format: 'Letter', landscape: true })
    );
  });

  test('usa format A4 por defecto cuando no se especifica', async () => {
    const buffer = await generarPdfAccesible('<html></html>', {}, puppeteer);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(mockPage.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'A4' })
    );
  });

  test('cierra el browser en finally incluso si ocurre un error', async () => {
    mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

    await expect(generarPdfAccesible('<html></html>', {}, puppeteer)).rejects.toThrow('PDF generation failed');

    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });

  test('el buffer devuelto empieza con %PDF', async () => {
    mockPage.pdf.mockResolvedValue(Buffer.from('%PDF-1.7\nfake content'));

    const buffer = await generarPdfAccesible('<html></html>', {}, puppeteer);

    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });
});
