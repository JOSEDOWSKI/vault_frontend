/**
 * Genera un fingerprint del dispositivo físico para Zero Trust.
 * Usa WebGL y Canvas para identificar el hardware (GPU + drivers),
 * lo que produce el mismo hash en distintos browsers del mismo equipo.
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  // Características estables del hardware (no cambian por browser)
  components.push(navigator.hardwareConcurrency?.toString() ?? '');
  components.push((navigator as any).deviceMemory?.toString() ?? '');
  components.push(`${screen.width}x${screen.height}`);
  components.push(screen.colorDepth?.toString() ?? '');
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  components.push(navigator.platform ?? '');
  components.push(navigator.language);

  // WebGL — identifica el GPU físico (igual en todos los browsers del mismo equipo)
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
      }
      // Parámetros adicionales del contexto GL
      components.push(gl.getParameter(gl.MAX_TEXTURE_SIZE)?.toString() ?? '');
      components.push(gl.getParameter(gl.MAX_VERTEX_ATTRIBS)?.toString() ?? '');
    }
  } catch {
    // WebGL no disponible — continúa sin él
  }

  // Canvas fingerprint — el GPU renderiza de forma matemáticamente única según sus drivers
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d')!;
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 240, 60);
    ctx.fillStyle = '#069';
    ctx.fillText('IDEMAVault device check', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('IDEMAVault device check', 4, 17);
    // Arco con gradiente para maximizar diferencias por GPU
    const gradient = ctx.createLinearGradient(0, 0, 240, 0);
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(1, '#0000ff');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(120, 45, 10, 0, Math.PI * 2);
    ctx.fill();
    components.push(canvas.toDataURL());
  } catch {
    // Canvas no disponible — continúa sin él
  }

  const raw = components.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
