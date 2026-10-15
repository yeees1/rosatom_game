export const pairs = [
    {
        id: 'kurchatov',
        title: 'Курчатов и Ф-1',
        a: 'Игорь Курчатов',
        b: 'Реактор Ф-1',
        icons: ['portrait', 'f1'],
        text: 'Первый исследовательский реактор Ф-1 был запущен под руководством Игоря Курчатова.'
    },
    {
        id: 'uranium',
        title: 'Уран — ядерное топливо',
        a: 'Уран',
        b: 'Урановая руда',
        icons: ['uranium', 'ore'],
        text: 'Уран служит топливом для цепной ядерной реакции. В Ф-1 использовались блоки природного урана.'
    },
    {
        id: 'reactor',
        title: 'Управляемая реакция',
        a: 'Ядерный реактор',
        b: 'Цепная реакция',
        icons: ['reactor', 'chain'],
        text: 'В ядерном реакторе происходит управляемая цепная реакция деления ядер урана.'
    },
    {
        id: 'obninsk',
        title: 'Атом становится светом',
        a: 'Обнинская АЭС',
        b: 'Электричество',
        icons: ['plant', 'bulb'],
        text: '26 июня 1954 года состоялся энергетический пуск первой в мире Обнинской АЭС мощностью 5 МВт.'
    },
    {
        id: 'mayak',
        title: '«Маяк» и плутоний',
        a: 'Комбинат «Маяк»',
        b: 'Плутоний',
        icons: ['mayak', 'plutonium'],
        text: 'На комбинате № 817, современном ПО «Маяк», работал первый промышленный реактор для наработки плутония.'
    },
    {
        id: 'students',
        title: 'Вместе в сообществе',
        a: 'Студент',
        b: 'Сообщество студентов',
        icons: ['student', 'community'],
        text: 'Студент становится частью Сообщества студентов Росатома — встречает единомышленников и знакомится с отраслью.'
    },
    {
        id: 'science',
        title: 'Наука и промышленность',
        a: 'Научная лаборатория',
        b: 'Промышленность',
        icons: ['flask', 'factory'],
        text: 'Атомный проект объединил учёных, инженеров и производственников. Отрасль появилась благодаря их совместной работе.'
    },
    {
        id: 'future',
        title: 'Будущее отрасли',
        a: 'Молодые специалисты',
        b: 'Атомная отрасль',
        icons: ['team', 'atom'],
        text: 'Сегодняшние студенты — будущие специалисты атомной отрасли.'
    }
];

export function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export class Game {
    constructor({count = 8, players = 1, seconds = 240, letter = 'А', random = Math.random} = {}) {
        this.pairs = pairs.slice(0, count);
        this.players = players;
        this.seconds = seconds;
        this.letter = letter;
        this.cards = shuffle(this.pairs.flatMap(p => [0, 1].map(side => ({
            id: `${p.id}-${side}`,
            pair: p.id,
            label: side ? p.b : p.a,
            icon: p.icons[side],
            hidden: true,
            matched: false
        }))), random);
        this.status = 'ready';
        this.selected = [];
        this.found = [];
        this.turn = 0;
        this.moves = 0;
        this.mistakes = 0;
        this.locked = false;
    }

    start(now = Date.now()) {
        if (this.status !== 'ready') return;
        this.status = 'playing';
        this.deadline = now + this.seconds * 1000;
    }

    remaining(now = Date.now()) {
        return this.status === 'ready' ? this.seconds : Math.max(0, Math.ceil((this.deadline - now) / 1000));
    }

    tick(now = Date.now()) {
        if (this.status === 'playing' && this.remaining(now) === 0) {
            this.status = 'timeout';
            this.locked = false;
            return true;
        }
        return false;
    }

    select(id, now = Date.now()) {
        this.tick(now);
        const card = this.cards.find(c => c.id === id);
        if (this.status !== 'playing' || this.locked || !card || card.matched || this.selected.includes(id)) return null;
        card.hidden = false;
        this.selected.push(id);
        if (this.selected.length === 1) return {type: 'first'};
        this.moves++;
        const first = this.cards.find(c => c.id === this.selected[0]);
        if (first.pair === card.pair) {
            first.matched = card.matched = true;
            this.found.push(card.pair);
            this.selected = [];
            this.nextTurn();
            if (this.found.length === this.pairs.length) this.status = 'won';
            return {type: 'match', pair: this.pairs.find(p => p.id === card.pair)};
        }
        this.mistakes++;
        this.locked = true;
        return {type: 'miss'};
    }

    resolveMiss(now = Date.now()) {
        if (!this.locked) return;
        this.selected.forEach(id => {
            this.cards.find(c => c.id === id).hidden = true;
        });
        this.selected = [];
        this.locked = false;
        this.tick(now);
        this.nextTurn();
    }

    nextTurn() {
        this.turn = (this.turn + 1) % this.players;
    }
}
