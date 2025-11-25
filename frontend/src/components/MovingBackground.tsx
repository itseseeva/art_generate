import { useRef, useEffect } from 'react';
import { Renderer, Program, Mesh, Triangle, Vec2 } from 'ogl';

const vertex = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `
#ifdef GL_ES
precision lowp float;
#endif

uniform vec2 uResolution;
uniform float uTime;

void main() {
  // нормализуем координаты [-1,1]
  vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;

  // более яркая анимация: "плазма" + синус
  float color1 = 0.5 + 0.5 * sin(uTime + uv.x * 3.0) * cos(uTime + uv.y * 3.0);
  float color2 = 0.5 + 0.5 * sin(uTime * 1.5 + uv.x * 2.0) * cos(uTime * 1.5 + uv.y * 2.0);
  float color = (color1 + color2) * 0.5;

  // более яркие цвета
  vec3 finalColor = vec3(
    color * 0.8 + 0.2,
    color * 0.4 + 0.3,
    1.0 - color * 0.6 + 0.4
  );

  gl_FragColor = vec4(finalColor, 0.8);
}
`;

export default function MovingBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas.parentElement;

    console.log('MovingBackground: Initializing WebGL...');
    console.log('Canvas:', canvas);
    console.log('Parent:', parent);

    const renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio, 2),
      canvas,
    });

    const gl = renderer.gl;
    const geometry = new Triangle(gl);

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Vec2() },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      renderer.setSize(w, h);
      program.uniforms.uResolution.value.set(w, h);
    };

    window.addEventListener('resize', resize);
    resize();

    const start = performance.now();
    let frame;

    const loop = () => {
      program.uniforms.uTime.value = (performance.now() - start) / 1000;
      renderer.render({ scene: mesh });
      frame = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="bg-canvas" />;
}
