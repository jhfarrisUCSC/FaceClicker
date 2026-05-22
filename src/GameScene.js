class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        var colors = ['blue', 'green', 'pink', 'purple', 'red', 'yellow'];
        var shapes = ['circle', 'rhombus', 'square'];
        for (var c = 0; c < colors.length; c++) {
            for (var s = 0; s < shapes.length; s++) {
                var key = colors[c] + '_body_' + shapes[s];
                this.load.image(key, 'assets/' + key + '.png');
            }
        }

        var faces = [
            'face_smile_open_eye',
            'face_smile_open_eye_2',
            'face_smile_open_eye_3',
            'face_smile_closed_eye',
            'face_frown_open_eye',
            'face_frown_open_eye_2',
            'face_frown_closed_eye',
            'face_frown_closed_eye_2',
            'face_grimace_open_eye'
        ];
        for (var f = 0; f < faces.length; f++) {
            this.load.image(faces[f], 'assets/' + faces[f] + '.png');
        }
    }

    create() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.combo = 0;
        this.gridCells = [];
        this.isRoundActive = false;
        this.target = null;
        this.targetDisplay = null;
        this.hudGroup = null;
        this.timerText = null;
        this.timerEvent = null;
        this.timeLeft = 0;

        this.colors = ['blue', 'green', 'pink', 'purple', 'red', 'yellow'];
        this.shapes = ['circle', 'rhombus', 'square'];
        this.faceKeys = [
            'face_smile_open_eye',
            'face_smile_open_eye_2',
            'face_smile_open_eye_3',
            'face_smile_closed_eye',
            'face_frown_open_eye',
            'face_frown_open_eye_2',
            'face_frown_closed_eye',
            'face_frown_closed_eye_2',
            'face_grimace_open_eye'
        ];

        this.showTitle();
    }

    showTitle() {
        var title = this.add.text(400, 180, 'FACECLICKER', {
            fontSize: '64px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4a2d7a'
        }).setOrigin(0.5);

        var subtitle = this.add.text(400, 260, 'Find the matching face in the grid!', {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#666666'
        }).setOrigin(0.5);

        var instructions = this.add.text(400, 320,
            'Click the face that matches the target.\nWrong clicks cost a life. Time runs out? Also costs a life!\nBuild combos for bonus points.', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#888888',
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5);

        var startBtn = this.add.text(400, 430, '  CLICK TO START  ', {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#7b4db8',
            padding: { x: 24, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.tweens.add({
            targets: startBtn,
            scale: 1.08,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        startBtn.on('pointerdown', function () {
            this.tweens.killAll();
            title.destroy();
            subtitle.destroy();
            instructions.destroy();
            startBtn.destroy();
            this.startRound();
        }, this);
    }

    getGridSize() {
        if (this.level <= 1) return { cols: 3, rows: 2 };
        if (this.level === 2) return { cols: 3, rows: 3 };
        if (this.level === 3) return { cols: 4, rows: 3 };
        if (this.level === 4) return { cols: 4, rows: 4 };
        if (this.level === 5) return { cols: 5, rows: 4 };
        if (this.level === 6) return { cols: 5, rows: 5 };
        if (this.level === 7) return { cols: 6, rows: 5 };
        return { cols: 6, rows: 6 };
    }

    getTimeLimit() {
        if (this.level <= 2) return 15;
        if (this.level <= 4) return 12;
        if (this.level <= 6) return 10;
        return 8;
    }

    generateCharacter() {
        var color = this.colors[Math.floor(Math.random() * this.colors.length)];
        var shape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
        var face = this.faceKeys[Math.floor(Math.random() * this.faceKeys.length)];
        return { bodyKey: color + '_body_' + shape, faceKey: face };
    }

    generateDistractor(target, usedKeys) {
        var difficulty = this.level;
        var attempts = 0;
        var char;

        do {
            char = this.generateCharacter();
            attempts++;
            if (attempts > 200) break;

            var key = char.bodyKey + '|' + char.faceKey;
            if (key === target.bodyKey + '|' + target.faceKey) continue;
            if (usedKeys.indexOf(key) !== -1) continue;

            // At higher levels, allow distractors that share attributes with the target
            // At lower levels, prefer distractors that share fewer attributes
            if (difficulty <= 2) {
                // Easy: try to avoid same color AND same shape (but allow one match)
                var sameColor = char.bodyKey.split('_')[0] === target.bodyKey.split('_')[0];
                var sameShape = char.bodyKey.split('_').pop() === target.bodyKey.split('_').pop();
                var sameFace = char.faceKey === target.faceKey;
                if (sameColor && sameShape && sameFace) continue;
                if (sameColor && sameShape && attempts < 50) continue;
            }
            break;
        } while (true);

        return char;
    }

    charactersEqual(a, b) {
        return a.bodyKey === b.bodyKey && a.faceKey === b.faceKey;
    }

    startRound() {
        this.clearGrid();

        var grid = this.getGridSize();
        var totalCells = grid.cols * grid.rows;

        this.target = this.generateCharacter();

        var characters = [];
        var usedKeys = [this.target.bodyKey + '|' + this.target.faceKey];
        var matchIndex = Math.floor(Math.random() * totalCells);

        for (var i = 0; i < totalCells; i++) {
            if (i === matchIndex) {
                characters.push({ bodyKey: this.target.bodyKey, faceKey: this.target.faceKey, isMatch: true });
            } else {
                var char = this.generateDistractor(this.target, usedKeys);
                var key = char.bodyKey + '|' + char.faceKey;
                usedKeys.push(key);
                char.isMatch = false;
                characters.push(char);
            }
        }

        this.renderTargetDisplay();
        this.renderHUD();
        this.renderGrid(characters, grid);

        this.timeLeft = this.getTimeLimit();
        this.isRoundActive = true;
        if (this.timerEvent) this.timerEvent.remove();
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.tickTimer,
            callbackScope: this,
            loop: true
        });
    }

    tickTimer() {
        if (!this.isRoundActive) return;
        this.timeLeft--;
        this.timerText.setText(this.timeLeft + 's');

        if (this.timeLeft <= 3) {
            this.timerText.setColor('#ff0000');
            this.tweens.add({
                targets: this.timerText,
                scale: 1.3,
                duration: 100,
                yoyo: true
            });
        }

        if (this.timeLeft <= 0) {
            this.roundFailed();
        }
    }

    renderTargetDisplay() {
        if (this.targetDisplay) this.targetDisplay.destroy(true);
        this.targetDisplay = this.add.container(400, 70);

        var label = this.add.text(0, -38, 'FIND THIS FACE', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4a2d7a'
        }).setOrigin(0.5);

        var body = this.add.image(0, 10, this.target.bodyKey).setScale(0.45);
        var face = this.add.image(0, 10, this.target.faceKey).setScale(0.45);

        this.targetDisplay.add([label, body, face]);

        // Pulsing highlight
        var ring = this.add.circle(0, 10, 48, 0x7b4db8, 0).setStrokeStyle(3, 0x7b4db8);
        this.targetDisplay.addAt(ring, 0);
        this.tweens.add({
            targets: ring,
            alpha: 0.6,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    renderHUD() {
        if (this.hudGroup) this.hudGroup.destroy(true);
        this.hudGroup = this.add.container(0, 0);

        var scoreText = this.add.text(20, 16, 'Score: ' + this.score, {
            fontSize: '20px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#333333'
        });

        var levelText = this.add.text(20, 44, 'Level ' + this.level, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#666666'
        });

        var comboText = this.add.text(20, 68, this.combo > 0 ? ('Combo x' + this.combo + '!') : '', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#e67e22'
        });
        this.comboTextRef = comboText;

        var heartsStr = '';
        for (var i = 0; i < 3; i++) {
            heartsStr += (i < this.lives) ? '\u2665 ' : '\u2661 ';
        }
        var livesText = this.add.text(780, 16, heartsStr.trim(), {
            fontSize: '30px',
            fontFamily: 'Arial',
            color: '#e74c3c'
        }).setOrigin(1, 0);

        this.timerText = this.add.text(780, 55, this.timeLeft + 's', {
            fontSize: '22px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#333333'
        }).setOrigin(1, 0);

        this.hudGroup.add([scoreText, levelText, comboText, livesText, this.timerText]);
    }

    renderGrid(characters, grid) {
        this.gridCells = [];

        var gridAreaTop = 125;
        var gridAreaBottom = 580;
        var gridAreaLeft = 50;
        var gridAreaRight = 750;

        var availWidth = gridAreaRight - gridAreaLeft;
        var availHeight = gridAreaBottom - gridAreaTop;

        var cellWidth = availWidth / grid.cols;
        var cellHeight = availHeight / grid.rows;

        var scale = Math.min(cellWidth / 200, cellHeight / 200) * 0.82;

        for (var row = 0; row < grid.rows; row++) {
            for (var col = 0; col < grid.cols; col++) {
                var idx = row * grid.cols + col;
                var char = characters[idx];

                var x = gridAreaLeft + cellWidth * col + cellWidth / 2;
                var y = gridAreaTop + cellHeight * row + cellHeight / 2;

                let container = this.add.container(x, y);
                var body = this.add.image(0, 0, char.bodyKey).setScale(scale);
                var face = this.add.image(0, 0, char.faceKey).setScale(scale);
                container.add([body, face]);

                container.setSize(body.displayWidth, body.displayHeight);
                container.setInteractive({ useHandCursor: true });

                container.charData = char;

                container.on('pointerdown', function () {
                    this.onCellClicked(container);
                }, this);

                // Hover effects
                container.on('pointerover', function () {
                    if (this.isRoundActive) {
                        this.setAlpha(0.75);
                        this.setScale(1.08);
                    }
                }, container);

                container.on('pointerout', function () {
                    this.setAlpha(1);
                    this.setScale(1);
                }, container);

                // Entry animation
                container.setAlpha(0);
                container.setScale(0.2);
                this.tweens.add({
                    targets: container,
                    alpha: 1,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 350,
                    delay: idx * 40,
                    ease: 'Back.easeOut'
                });

                this.gridCells.push(container);
            }
        }
    }

    onCellClicked(container) {
        if (!this.isRoundActive) return;

        var char = container.charData;
        if (char.isMatch) {
            this.roundSuccess(container);
        } else {
            this.wrongClick(container);
        }
    }

    roundSuccess(container) {
        this.isRoundActive = false;
        if (this.timerEvent) this.timerEvent.remove();
        this.combo++;

        var basePoints = 100;
        var comboMultiplier = this.combo;
        var timeBonus = this.timeLeft * 10;
        var points = (basePoints + timeBonus) * comboMultiplier;
        this.score += points;

        // Bounce animation on the found face
        this.tweens.add({
            targets: container,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 200,
            yoyo: true,
            ease: 'Quad.easeInOut'
        });

        // Green flash overlay
        var greenOverlay = this.add.rectangle(
            container.x, container.y,
            120, 120,
            0x00ff00, 0.35
        );
        this.tweens.add({
            targets: greenOverlay,
            alpha: 0,
            duration: 600,
            onComplete: function () { greenOverlay.destroy(); }
        });

        // Floating points text
        var pointsText = this.add.text(container.x, container.y - 50, '+' + points, {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#27ae60'
        }).setOrigin(0.5);
        this.tweens.add({
            targets: pointsText,
            y: pointsText.y - 70,
            alpha: 0,
            duration: 1200,
            ease: 'Cubic.easeOut',
            onComplete: function () { pointsText.destroy(); }
        });

        // Dim the non-matching faces
        for (var i = 0; i < this.gridCells.length; i++) {
            var cell = this.gridCells[i];
            if (cell !== container) {
                this.tweens.add({
                    targets: cell,
                    alpha: 0.2,
                    duration: 400
                });
            }
        }

        this.time.delayedCall(1000, function () {
            this.level++;
            this.startRound();
        }, [], this);
    }

    wrongClick(container) {
        this.combo = 0;

        // Red shake
        var origX = container.x;
        this.tweens.add({
            targets: container,
            x: origX - 12,
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: function () { container.x = origX; }
        });

        // Red flash
        var redOverlay = this.add.rectangle(
            container.x, container.y,
            120, 120,
            0xff0000, 0.35
        );
        this.tweens.add({
            targets: redOverlay,
            alpha: 0,
            duration: 500,
            onComplete: function () { redOverlay.destroy(); }
        });

        this.lives--;
        this.renderHUD();

        if (this.lives <= 0) {
            this.time.delayedCall(600, this.gameOver, [], this);
        }
    }

    roundFailed() {
        this.isRoundActive = false;
        if (this.timerEvent) this.timerEvent.remove();
        this.combo = 0;
        this.lives--;
        this.renderHUD();

        // Screen flash red
        var overlay = this.add.rectangle(400, 300, 800, 600, 0xff0000, 0.25);
        this.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: 800,
            onComplete: function () { overlay.destroy(); }
        });

        // "TIME'S UP" text
        var timeUpText = this.add.text(400, 300, "TIME'S UP!", {
            fontSize: '48px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#e74c3c'
        }).setOrigin(0.5);
        this.tweens.add({
            targets: timeUpText,
            alpha: 0,
            scale: 2,
            duration: 1000,
            ease: 'Cubic.easeOut',
            onComplete: function () { timeUpText.destroy(); }
        });

        if (this.lives <= 0) {
            this.time.delayedCall(1200, this.gameOver, [], this);
        } else {
            this.time.delayedCall(1200, this.startRound, [], this);
        }
    }

    gameOver() {
        this.isRoundActive = false;
        if (this.timerEvent) this.timerEvent.remove();
        this.clearGrid();
        if (this.targetDisplay) { this.targetDisplay.destroy(true); this.targetDisplay = null; }
        if (this.hudGroup) { this.hudGroup.destroy(true); this.hudGroup = null; }

        var panel = this.add.container(400, 300);

        var bg = this.add.rectangle(0, 0, 420, 320, 0x2c1654, 0.97).setStrokeStyle(4, 0x9b59b6);
        var goText = this.add.text(0, -100, 'GAME OVER', {
            fontSize: '48px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#e74c3c'
        }).setOrigin(0.5);

        var finalScore = this.add.text(0, -35, 'Final Score: ' + this.score, {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#f1c40f'
        }).setOrigin(0.5);

        var levelReached = this.add.text(0, 10, 'Reached Level ' + this.level, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#cccccc'
        }).setOrigin(0.5);

        var bestCombo = this.add.text(0, 45, 'Best Combo: x' + this.combo, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#e67e22'
        }).setOrigin(0.5);

        var restartBtn = this.add.text(0, 105, '  PLAY AGAIN  ', {
            fontSize: '26px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#7b4db8',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.tweens.add({
            targets: restartBtn,
            scale: 1.08,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        restartBtn.on('pointerdown', function () {
            this.tweens.killAll();
            panel.destroy();
            this.score = 0;
            this.lives = 3;
            this.level = 1;
            this.combo = 0;
            this.startRound();
        }, this);

        panel.add([bg, goText, finalScore, levelReached, bestCombo, restartBtn]);

        // Panel entry animation
        panel.setAlpha(0);
        panel.setScale(0.5);
        this.tweens.add({
            targets: panel,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 400,
            ease: 'Back.easeOut'
        });
    }

    clearGrid() {
        for (var i = 0; i < this.gridCells.length; i++) {
            this.gridCells[i].destroy();
        }
        this.gridCells = [];
    }
}
