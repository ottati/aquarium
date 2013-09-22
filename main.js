// 定数
var SCREEN_SIZE = 600;
var FPS = 30;
var NUM_BOIDS = 200;            // ボイドの数
var BOID_SIZE = 4;              // ボイドのサイズ
var VISIBLE_RANGE = 100;        // ボイドの可視範囲
var IDEAL_DIST = 20;            // ボイドとボイドの理想距離
var MAX_SPEED = 5;              // ボイドの最大速度

var canvas = document.getElementById('world');
var ctx = canvas.getContext('2d');
var boids = [];                 // ボイドを格納
var enemies = [];               // 敵を格納

window.onload = function() {
    /**
     * canvas
     */
    canvas.width = canvas.height = SCREEN_SIZE;
    scaleRate = Math.min(window.innerWidth/SCREEN_SIZE, window.innerHeight/SCREEN_SIZE);
    canvas.style.width = canvas.style.height = SCREEN_SIZE*scaleRate + 'px';
    canvas.style.display = "block";
    canvas.style.margin = "auto";
    canvas.style.background = "#000033";
    
    /**
     * ボイド生成
     */
    for (var i=0; i<NUM_BOIDS; i++){
        var boid = new Boid(i);
        boids.push(boid);
    }
    
    /**
     * 敵生成
     */
    enemies.push(new Enemy());
    
    /**
     * クリックしている間は敵がボイドを追跡する
     */
    document.addEventListener('mousedown', function() {
        for (var i=0,len=enemies.length; i<len; i++) {
            enemies[i].startChase();
        }
    }, false);
    document.addEventListener('mouseup', function() {
        for (var i=0,len=enemies.length; i<len; i++) {
            enemies[i].endChase();
        }
    }, false);

    /**
     * シミュレート開始
     */
    setInterval(simulate, 1000/FPS);    
};


var simulate = function() {
    ctx.clearRect(0, 0, SCREEN_SIZE, SCREEN_SIZE);
    // update boids
    for (var i=0,len=boids.length; i<len; i++) {
        var b = boids[i];
        b.applyForces();
        b.move();
        b.draw();
    }
    // update enemies
    for (var i=0,len2=enemies.length; i<len2; i++) {
        var e = enemies[i];
        e.applyForces();
        e.move();
        e.draw();
    }
};


var Boid = function(index) {
    this.x = Math.random() * SCREEN_SIZE; // x座標
    this.y = Math.random() * SCREEN_SIZE; // y座標
    this.vx = (Math.random()*2-1)*3; // x方向の速度
    this.vy = (Math.random()*2-1)*3; // y方向の速度
    this.color = 'rgb('         // ボイドの色
        + Math.floor(Math.random()*255)
        + ', '
        + Math.floor(Math.random()*255)
        + ', '
        + Math.floor(Math.random()*200) + 55
        + ')';
    this.index = index;         // ボイドの番号
    this.escapes = false;       // 逃げフラグ
};
Boid.prototype = {
    applyForces: function() {     
        var visibleFriends = []; // 可視範囲の仲間のボイド達
        for (var i=0,len=boids.length; i<len; i++) {
            if (i == this.index) continue;
            var dist = getDistance(boids[i], this);
            if (dist > 0 && dist <= VISIBLE_RANGE) {
                visibleFriends.push(boids[i]);
            }
        }
        var visibleCenter = {x: 0, y: 0};  // 可視範囲の仲間の中心
        var visibleVelocity = {x: 0, y:0}; // 可視範囲の速度
        var nearestBoid = null; // 可視範囲の仲間の中でも接近しているボイド
        var minDist = 100000;
        for (var i=0,len=visibleFriends.length; i<len; i++) {
            var b = visibleFriends[i];
            visibleCenter.x += b.x;
            visibleCenter.y += b.y;
            visibleVelocity.x += b.vx;
            visibleVelocity.y += b.vy;
            if (getDistance(this, b) < IDEAL_DIST) {
                // Boids try to keep a small distance away from other objects 
                this.vx += -(b.x-this.x) / 100;
                this.vy += -(b.y-this.y) / 100;
            }
        }

        if (visibleFriends.length > 0) {
            visibleCenter.x /= visibleFriends.length;
            visibleCenter.y /= visibleFriends.length;
            visibleVelocity.x /= visibleFriends.length;
            visibleVelocity.y /= visibleFriends.length;
            // boids try to fly towards center of mass
            this.vx += (visibleCenter.x-this.x) / 100;
            this.vy += (visibleCenter.y-this.y) / 100;

            // boids try to match velocity with near boids
            this.vx += visibleVelocity.x / 8;
            this.vy += visibleVelocity.y / 8;
        }
        // escape from enemies
        var visibleEnemies = []; // 可視範囲に存在する敵
        for (var i=0,len=enemies.length; i<len; i++) {
            var e = enemies[i];
            var d = getDistance(e, this);
            if (d < VISIBLE_RANGE) {
                visibleEnemies.push(e);
                this.vx += -(e.x-this.x) / d;
                this.vy += -(e.y-this.y) / d;
            }
        }
        if (visibleEnemies.length > 0) {
            this.escapes = true;
        } else {
            this.escapes = false;
        }
        /**
         * スピード制限
         */
        var currentSpeed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
        var limitSpeed = this.escapes ? MAX_SPEED*2 : MAX_SPEED;
        if (currentSpeed >= limitSpeed) {
            var rate = MAX_SPEED / currentSpeed;
            this.vx *= rate;
            this.vy *= rate;
        }
    },
    /**
     * 速度にしたがって座標の更新
     */
    move: function() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0) this.x = SCREEN_SIZE;
        if (this.x > SCREEN_SIZE) this.x = 0;
        if (this.y < 0) this.y = SCREEN_SIZE;
        if (this.y > SCREEN_SIZE) this.y = 0;
    },
    /**
     * 描画
     */
    draw: function() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x-BOID_SIZE/2, this.y-BOID_SIZE/2, BOID_SIZE, BOID_SIZE)
    },
};


var Enemy = function() {
    this.x = Math.random()*SCREEN_SIZE;
    this.y = Math.random()*SCREEN_SIZE;
    this.vx = 0;
    this.vy = 0;
    this.chases = false;
    this.distination = {
        x: Math.random()*SCREEN_SIZE,
        y: Math.random()*SCREEN_SIZE
    };
    this.target = null;
    this.maxSpeed = MAX_SPEED/2;
    this.color = 'rgb(0, 0, 255)';
}
Enemy.prototype = {
    applyForces: function() {
        if (this.chases) {
            // targetを追跡
            var d = getDistance(this, this.target);
            this.vx += (this.target.x - this.x) / d;
            this.vy += (this.target.y - this.y) / d;
        } else {
            // 適当にぶらぶら
            this.vx += (this.distination.x - this.x) / 2000;
            this.vy += (this.distination.x - this.x) / 2000;
            if (Math.random() < 0.01) {
                this.distination.x = Math.random() * SCREEN_SIZE;
                this.distination.y = Math.random() * SCREEN_SIZE;
            }
        }
        /**
         * スピード制限
         */
        var currentSpeed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
        if (currentSpeed >= this.maxSpeed) {
            var rate = this.maxSpeed / currentSpeed;
            this.vx *= rate;
            this.vy *= rate;
        }
    },
    /**
     * 追尾開始
     */
    startChase: function() {
        this.chases = true;
        this.target = boids[Math.floor(Math.random()*boids.length)];
        this.color = 'rgb(200, 30, 30)';
        this.maxSpeed = MAX_SPEED*2;
    },
    /**
     * 追尾終了
     */
    endChase: function() {
        this.chases = false;
        this.color = 'rgb(0, 0, 255)';
        this.maxSpeed = MAX_SPEED/2;        
    },
    move: function() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0) this.x = SCREEN_SIZE;
        if (this.x > SCREEN_SIZE) this.x = 0;
        if (this.y < 0) this.y = SCREEN_SIZE;
        if (this.y > SCREEN_SIZE) this.y = 0;
    },
    draw: function() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x-BOID_SIZE, this.y-BOID_SIZE, BOID_SIZE*2, BOID_SIZE*2)
    },
};

/**
 * ２つのObjectの距離を返します
 */
var getDistance = function(b1, b2) {
    var x = Math.abs(b1.x - b2.x);
    var y = Math.abs(b1.y - b2.y);
    return Math.sqrt(x*x + y*y);
};
