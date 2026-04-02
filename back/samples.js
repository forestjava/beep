import {
  AudioContext,
  OscillatorNode,
  GainNode,
  StereoPannerNode,
} from 'node-web-audio-api';

// --- 1. Создание контекста (ещё не обязательно «running» до первого использования — см. MDN audioContext.state)
const audioContext = new AudioContext();

// AudioDestinationNode обычно стерео: канал 0 — левое ухо, канал 1 — правое.
// Два моно-источника сами по себе в один destination попали бы в оба канала (up-mix).
// StereoPannerNode задаёт, как моно-сигнал распределяется по стереопаре.

const gainL = new GainNode(audioContext, { gain: 0.15 });
const gainR = new GainNode(audioContext, { gain: 0.15 });

// pan: -1 — весь сигнал в левый канал; +1 — весь сигнал в правый канал (MDN / спека).
const panLeft = new StereoPannerNode(audioContext, { pan: -1 });
const panRight = new StereoPannerNode(audioContext, { pan: 1 });

gainL.connect(panLeft);
gainR.connect(panRight);
panLeft.connect(audioContext.destination);
panRight.connect(audioContext.destination);

// Левое ухо: 440 Hz
const osc440 = new OscillatorNode(audioContext, { frequency: 440, type: 'sine' });
osc440.connect(gainL);

// Правое ухо: 880 Hz
const osc880 = new OscillatorNode(audioContext, { frequency: 880, type: 'sine' });
osc880.connect(gainR);

// --- 2. Запуск при старте процесса: start() / stop() без аргументов — время по умолчанию (0 в спецификации);
// движок интерпретирует «в прошлом» как «как можно скорее» для немедленной остановки.
osc440.start();
osc880.start();
// stop() намеренно не вызываем — генерация идёт непрерывно, пока пользователь не прервёт приложение.

console.log('Генерация запущена (440 Hz слева, 880 Hz справа). Нажмите Ctrl+C для остановки.');

// --- 3. Завершение по Ctrl+C (SIGINT): сначала явно останавливаем источники, затем закрываем контекст
function shutdown() {
  console.log('\nПолучен SIGINT (Ctrl+C): останавливаем осцилляторы...');
  osc440.stop();
  osc880.stop();

  console.log('Закрываем AudioContext (освобождение устройства, останов рендера)...');
  audioContext.close().finally(() => {
    console.log('Готово.');
    process.exit(0);
  });
}

process.once('SIGINT', shutdown);

// На Windows при закрытии окна консоли иногда приходит SIGBREAK; по желанию можно обработать и его.
process.once('SIGBREAK', shutdown);
