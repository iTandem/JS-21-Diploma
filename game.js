'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {
    if (!(vector instanceof (Vector))) {
      throw new Error('Ошибка! Можно прибавлять к вектору только вектор типа Vector.');
    }
    const result = new Vector;
    result.x = this.x + vector.x;
    result.y = this.y + vector.y;
    return result;
  }

  times(num) {
    const result = new Vector;
    result.x = this.x * num;
    result.y = this.y * num;
    return result;
  }
}

class Actor {
  constructor(pos = new Vector(), size = new Vector(1, 1), speed = new Vector()) {
    if (!(pos instanceof (Vector)) || !(size instanceof (Vector)) || !(speed instanceof (Vector))) {
      throw new Error('Ошибка! Все переданные аргументы должны быть объектами Vector');
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }

  get left() {
    return this.pos.x;
  }

  get right() {
    return this.pos.x + this.size.x;
  }

  get top() {
    return this.pos.y;
  }

  get bottom() {
    return this.pos.y + this.size.y;
  }

  get type() {
    return 'actor';
  }

  act() {
  }

  isIntersect(actor) {
    if (!(actor instanceof (Actor)) || actor === undefined) {
      throw new Error('Ошибка! Аргумент не определён или не является объектом Actor')
    }
    if (actor === this) {
      return false;
    }
    return !(this.right <= actor.left ||
      this.left >= actor.right ||
      this.bottom <= actor.top ||
      this.top >= actor.bottom);
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;
    this.height = grid.length;
    this.width = this.height > 0 ? Math.max(...grid.map(el => el.length)) : 0;
    this.status = null;
    this.finishDelay = 1;
    this.player = this.actors.find(actor => actor.type === 'player');
  }

  isFinished() {
    return (this.status !== null && this.finishDelay < 0);
  }


  actorAt(obj) {
    if (!(obj instanceof (Actor)) || obj === undefined) {
      throw new Error('Ошибка! Аргумент не определён или не является объектом Actor')
    }
    if (this.actors === undefined) {
      return undefined;
    }
    for (const actor of this.actors) {
      if (actor.isIntersect(obj)) {
        return actor;
      }
    }
    return undefined;
  }

  obstacleAt(destination, size) {
    if (!(destination instanceof (Vector)) || !(size instanceof (Vector))) {
      throw new Error('Ошибка! Аргументы не являются объектами Vector')
    }
    let actor = new Actor(destination, size);
    if (actor.top < 0 || actor.left < 0 || actor.right > this.width) {
      return 'wall';
    }
    if (actor.bottom > this.height) {
      return 'lava';
    }
    for (let col = Math.floor(actor.top); col < Math.ceil(actor.bottom); col++) {
      for (let row = Math.floor(actor.left); row < Math.ceil(actor.right); row++) {
        if (this.grid[col][row] !== undefined) {
          return this.grid[col][row];
        }
      }
    }
    return undefined;
  }

  removeActor(actor) {
    this.actors = this.actors.filter(item => item.pos !== actor.pos || item.size !== actor.size || item.speed !== actor.speed);
  }

  noMoreActors(type) {
    return !(this.actors.find(actor => actor.type === type));
  }

  playerTouched(type, actor) {
    if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
    }
    if (type === 'coin' && actor.type === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(dictionary) {
    this.dictionary = dictionary;
  }

  actorFromSymbol(symbol) {
    if (symbol === undefined) {
      return undefined;
    }
    return this.dictionary[symbol] ? this.dictionary[symbol] : undefined;
  }

  obstacleFromSymbol(symbol) {
    if (symbol === 'x') {
      return 'wall';
    } else if (symbol === '!') {
      return 'lava';
    } else {
      return undefined;
    }
  }

  createGrid(plan) {
    const result = [];
    for (const row of plan) {
      const newRow = [];
      for (const cell of row) {
        newRow.push(this.obstacleFromSymbol(cell));
      }
      result.push(newRow);
    }
    return result;
  }

  createActors(plan) {
    const result = [];
    if (this.dictionary) {
      plan.forEach((row, y) => {
        row.split('').forEach((cell, x) => {
          if (typeof this.dictionary[cell] === 'function') {
            const pos = new Vector(x, y);
            const actor = new this.dictionary[cell](pos);
            if (actor instanceof Actor) {
              result.push(actor);
            }
          }
        })
      })
    }
    return result;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(), speed = new Vector()) {
    super(pos, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(t = 1) {
    return this.pos.plus(this.speed.times(t));
  }

  handleObstacle() {
    this.speed.x = -this.speed.x;
    this.speed.y = -this.speed.y;
  }

  act(t, lvl) {
    let nextPosition = this.getNextPosition(t);
    if (!lvl.obstacleAt(nextPosition, this.size)) {
      this.pos = nextPosition;
    } else {
      this.handleObstacle();
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 3));
    this.init = pos;
  }

  handleObstacle() {
    this.pos = this.init;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector()) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.initPos = pos.plus(new Vector(0.2, 0.1));
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * Math.PI * 2;
  }

  get type() {
    return 'coin';
  }

  updateSpring(t = 1) {
    this.spring += this.springSpeed * t;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(t = 1) {
    this.updateSpring(t);
    return this.initPos.plus(this.getSpringVector());
  }

  act(t) {
    this.pos = this.getNextPosition(t);
  }
}

class Player extends Actor {
  constructor(pos = new Vector(1, 1)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector());
  }

  get type() {
    return 'player';
  }
}

const actors = {
  '@': Player,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'v': FireRain
};
const parser = new LevelParser(actors);

loadLevels().then(result => runGame(JSON.parse(result), parser, DOMDisplay)).then(() => alert('Вы выиграли приз!'));