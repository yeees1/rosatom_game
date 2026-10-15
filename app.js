import {Game} from './engine.js';
import {art} from './art.js';

const $ = id => document.getElementById(id);
let config = {count: 8, players: 1, seconds: 240, letter: 'А'};
try {
    const saved = JSON.parse(localStorage.getItem('atomic-links-settings'));
    if (saved && [6, 8].includes(saved.count) && Number.isSafeInteger(saved.players) && saved.players >= 1 && typeof saved.letter === 'string' && saved.letter.trim()) config = {
        count: saved.count,
        players: saved.players,
        seconds: Number.isSafeInteger(saved.seconds / 60) && saved.seconds >= 60 ? saved.seconds : 240,
        letter: [...saved.letter.trim()][0].toUpperCase()
    };
} catch {
}
let game, missTimeout, finalRemaining = 240;
const infoDialog = document.createElement('dialog');
infoDialog.id = 'info-dialog';
document.body.append(infoDialog);

function announce(text) {
    $('announcement').textContent = text;
}

function closeDialogs() {
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
}

function reset() {
    clearTimeout(missTimeout);
    closeDialogs();
    game = new Game(config);
    finalRemaining = game.seconds;
    render();
}

function openInfo(pair) {
    infoDialog.replaceChildren();
    const close = document.createElement('button');
    close.className = 'close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Закрыть');
    close.onclick = () => infoDialog.close();
    const eyebrow = document.createElement('div');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'СВЯЗЬ ВОССТАНОВЛЕНА';
    const title = document.createElement('h2');
    title.textContent = pair.title;
    const description = document.createElement('p');
    description.textContent = pair.text;
    const action = document.createElement('button');
    action.className = 'primary';
    action.textContent = 'Продолжить';
    action.onclick = () => infoDialog.close();
    infoDialog.append(close, eyebrow, title, description, action);
    infoDialog.showModal();
}

function render() {
    $('game-subtitle').textContent = `${game.pairs.length === 8 ? 'Восемь' : 'Шесть'} связей. Время: ${game.seconds / 60} мин. Ни одного слова.`;
    const focusId = document.activeElement?.dataset?.card;
    $('board').replaceChildren();
    game.cards.forEach((card, i) => {
        const button = document.createElement('button');
        button.className = 'card';
        button.dataset.card = card.id;
        const selected = game.selected.includes(card.id);
        button.classList.toggle('selected', selected);
        button.classList.toggle('matched', card.matched);
        button.classList.toggle('hidden', card.hidden);
        button.classList.toggle('miss', game.locked && selected);
        button.disabled = game.status !== 'playing' || card.matched || game.locked || selected;
        button.setAttribute('aria-label', card.hidden ? `Карточка ${i + 1}, закрыта` : `${card.label}${card.matched ? ', пара найдена' : ''}`);
        button.setAttribute('aria-pressed', String(selected));
        button.innerHTML = `<span class="card-number">${String(i + 1).padStart(2, '0')}</span>${card.hidden ? '<span class="back-icon" aria-hidden="true">✳</span>' : art(card.icon)}<span class="card-label">${card.hidden ? 'ОТКРЫТЬ КАРТУ' : card.label}</span>`;
        button.onclick = () => pick(card.id);
        $('board').append(button);
    });
    $('answers').replaceChildren();
    for (let i = 0; i < game.pairs.length; i++) {
        const pair = game.pairs.find(p => p.id === game.found[i]);
        const row = document.createElement('div');
        row.className = `answer-slot${pair ? ' found' : ''}`;
        row.innerHTML = `<span class="slot-number">${String(i + 1).padStart(2, '0')}</span>${pair ? `<span class="slot-title">${pair.title}</span><button class="info-button" aria-label="Подробнее: ${pair.title}">↗</button>` : '<span class="slot-empty">Связь ещё не найдена</span><span class="slot-line">—</span>'}`;
        if (pair) row.querySelector('button').onclick = () => openInfo(pair);
        $('answers').append(row);
    }
    $('progress').textContent = `${game.found.length} / ${game.pairs.length}`;
    $('progress-fill').style.width = `${game.found.length / game.pairs.length * 100}%`;
    $('card-count').textContent = `${game.cards.length} карточек`;
    $('moves').textContent = game.moves;
    $('mistakes').textContent = game.mistakes;
    $('player').textContent = `Участник ${game.turn + 1}`;
    $('turn-dots').textContent = game.players === 1 ? '' : `${game.turn + 1}/${game.players}`;
    $('start-button').innerHTML = game.status === 'ready' ? 'Начать игру <span>↗</span>' : 'Новая игра <span>↻</span>';
    $('settings-button').disabled = game.status === 'playing';
    $('settings-button').textContent = game.status === 'playing' ? 'Настройки после игры' : 'Настроить игру';
    const status = {ready: 'ГОТОВЫ К СТАРТУ', playing: 'ИГРА ИДЁТ', won: 'ВСЕ СВЯЗИ НАЙДЕНЫ', timeout: 'ВРЕМЯ ВЫШЛО'};
    $('status-pill').innerHTML = `<span></span> ${status[game.status]}`;
    $('status-pill').classList.toggle('active', game.status === 'playing');
    $('instruction').textContent = game.status === 'ready' ? 'Карточки закрыты. Начните, когда команда будет готова.' : game.status === 'won' ? 'Отличная работа! Все смысловые связи восстановлены.' : game.status === 'timeout' ? 'Можно изучить найденные связи и попробовать ещё раз.' : game.locked ? 'Эти карточки не связаны. Ход переходит дальше.' : game.selected.length ? 'Теперь выберите смысловую пару для этой карточки.' : `Участник ${game.turn + 1}, выберите две связанные карточки.`;
    $('board-note').textContent = game.status === 'playing' ? 'Играйте молча. Неверная пара переворачивается.' : 'Выбирайте две карточки, связанные по смыслу.';
    $('fragment-note').textContent = game.status === 'won' ? `Буква шифра: ${game.letter}` : 'Откроется после всех пар';
    document.querySelector('.fragment-preview').classList.toggle('unlocked', game.status === 'won');
    updateTimer();
    if (focusId && game.status === 'playing' && !game.locked) {
        const buttons = [...$('board').children];
        const next = buttons.find(b => b.dataset.card === focusId && !b.disabled) || buttons.find(b => !b.disabled);
        next?.focus({preventScroll: true});
    }
}

function updateTimer() {
    const remaining = game.status === 'won' ? finalRemaining : game.remaining();
    const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
    const seconds = String(remaining % 60).padStart(2, '0');
    $('timer').innerHTML = `${minutes}<span>:</span>${seconds}`;
    $('timer').setAttribute('aria-label', `Осталось ${Math.floor(remaining / 60)} минут ${remaining % 60} секунд`);
    $('time-fill').style.width = `${remaining / game.seconds * 100}%`;
    document.querySelector('.timer-block').classList.toggle('urgent', remaining <= 30);
}

function pick(id) {
    const wasPlaying = game.status === 'playing';
    const result = game.select(id);
    if (!result) {
        if (wasPlaying && game.status === 'timeout') {
            render();
            showEnd();
        }
        return;
    }
    if (result.type === 'first') announce('Первая карточка выбрана. Выберите вторую.');
    if (result.type === 'match') {
        announce(`Пара найдена: ${result.pair.title}. Ход участника ${game.turn + 1}.`);
        if (game.status === 'won') finalRemaining = game.remaining();
    }
    if (result.type === 'miss') {
        announce('Неверная пара. Карточки переворачиваются.');
        missTimeout = setTimeout(() => {
            game.resolveMiss();
            render();
            if (game.status === 'timeout') showEnd(); else announce(`Ход участника ${game.turn + 1}.`);
        }, 1100);
    }
    render();
    if (game.status === 'won') showEnd();
}

function showEnd() {
    clearTimeout(missTimeout);
    closeDialogs();
    const won = game.status === 'won';
    $('end-eyebrow').textContent = won ? 'ЭТАП 02 / МИССИЯ ВЫПОЛНЕНА' : 'ЭТАП 02 / ЕЩЁ ОДНА ПОПЫТКА';
    $('result-symbol').textContent = won ? game.letter : '↻';
    $('end-title').textContent = won ? 'Все связи восстановлены.' : 'Время вышло.';
    $('end-text').textContent = won ? 'Вы получили второй фрагмент шифра. Сохраните эту букву — она поможет открыть сейф профессора.' : `Вы нашли ${game.found.length} из ${game.pairs.length} пар. Изучите их связи и попробуйте снова — теперь вы знаете больше.`;
    const elapsed = game.seconds - (won ? finalRemaining : 0);
    $('result-stats').innerHTML = `<span><strong>${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}</strong>время</span><span><strong>${game.moves}</strong>ходов</span><span><strong>${game.mistakes}</strong>ошибок</span>`;
    $('end-dialog').showModal();
    announce(won ? `Победа! Буква шифра: ${game.letter}.` : 'Время вышло. Попробуйте ещё раз.');
}

$('start-button').onclick = () => {
    if (game.status === 'ready') {
        game.start();
        render();
        announce('Игра началась. Ход участника 1.');
    } else reset();
};
$('again-button').onclick = () => {
    reset();
    game.start();
    render();
};
$('rules-button').onclick = () => {
    $('rules-dialog').showModal();
};
$('settings-button').onclick = () => {
    const form = $('settings-form');
    form.elements.players.value = config.players;
    form.elements.minutes.value = config.seconds / 60;
    form.elements.count.value = config.count;
    form.elements.letter.value = config.letter;
    $('settings-dialog').showModal();
};
$('settings-form').onsubmit = event => {
    event.preventDefault();
    const form = event.currentTarget;
    for (const name of ['players', 'minutes']) {
        const input = form.elements[name];
        input.setCustomValidity(Number.isSafeInteger(input.valueAsNumber) && input.valueAsNumber >= 1 && (name !== 'minutes' || Number.isSafeInteger(input.valueAsNumber * 60)) ? '' : 'Введите целое положительное число.');
    }
    if (!form.reportValidity()) return;
    const letter = [...form.elements.letter.value.trim()][0];
    if (!letter) {
        form.elements.letter.focus();
        return;
    }
    config = {
        players: Number(form.elements.players.value),
        seconds: Number(form.elements.minutes.value) * 60,
        count: Number(form.elements.count.value),
        letter: letter.toUpperCase()
    };
    try {
        localStorage.setItem('atomic-links-settings', JSON.stringify(config));
    } catch {
    }
    reset();
};
$('settings-form').addEventListener('input', event => event.target.setCustomValidity(''));
document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => button.closest('dialog').close());
setInterval(() => {
    if (game.status !== 'playing') return;
    if (game.tick()) {
        render();
        showEnd();
    } else updateTimer();
}, 200);
reset();
