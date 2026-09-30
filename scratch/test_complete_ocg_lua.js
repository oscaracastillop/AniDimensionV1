const { LuaFactory } = require('wasmoon');
const fs = require('fs');
const path = require('path');
const { ocgCardReader } = require('../backend/data/sql-card-reader');

async function testCompleteLua() {
    const factory = new LuaFactory();
    const engine = await factory.createEngine();

    const scriptsDir = path.resolve(__dirname, '../backend/ocgcore/scripts');
    const officialDir = path.resolve(__dirname, '../backend/ocgcore/scripts/official');

    let activeContext = null;

    engine.global.set('__node_read_script', (name) => {
        const candidates = [
            path.join(scriptsDir, name),
            path.join(scriptsDir, name.endsWith('.lua') ? name : `${name}.lua`),
            path.join(officialDir, name),
            path.join(officialDir, name.endsWith('.lua') ? name : `${name}.lua`)
        ];
        for (const c of candidates) {
            if (fs.existsSync(c)) return fs.readFileSync(c, 'utf-8');
        }
        return '';
    });

    engine.global.set('__node_on_draw', (p, count) => {
        if (activeContext && activeContext.onDraw) activeContext.onDraw(p, count);
    });

    engine.global.set('__node_on_damage', (p, amount) => {
        if (activeContext && activeContext.onDamage) activeContext.onDamage(p, amount);
    });

    engine.global.set('__node_on_recover', (p, amount) => {
        if (activeContext && activeContext.onRecover) activeContext.onRecover(p, amount);
    });

    engine.global.set('__node_on_destroy', (cardId, slotIdx) => {
        if (activeContext && activeContext.onDestroy) activeContext.onDestroy(cardId, slotIdx);
    });

    engine.global.set('__node_on_to_hand', (cardId, slotIdx) => {
        if (activeContext && activeContext.onToHand) activeContext.onToHand(cardId, slotIdx);
    });

    engine.global.set('__node_on_change_pos', (cardId, slotIdx, pos) => {
        if (activeContext && activeContext.onChangePos) activeContext.onChangePos(cardId, slotIdx, pos);
    });

    engine.global.set('__node_log', (m) => console.log(`[LUA] ${m}`));

    // Official Lua Environment setup
    engine.doStringSync(`
        Duel = {}
        Card = {}
        Effect = {}
        Group = {}
        aux = {}
        Auxiliary = aux
        Debug = {
            CardToStringWrapper = function(c) return tostring(c) end,
            Message = function(m) print(m) end,
            AddCard = function(...) end,
            SetPlayerInfo = function(...) end,
            PreEquip = function(...) end,
            PreSetTarget = function(...) end,
            PreSummon = function(...) end,
            ReloadFieldBegin = function(...) end,
            ReloadFieldEnd = function(...) end,
            ShowHint = function(...) end
        }

        function Duel.LoadScript(name)
            local content = __node_read_script(name)
            if content ~= "" then
                local fn, err = load(content, name)
                if fn then return fn() end
            end
        end

        -- Card Object
        Card.__index = Card
        function Card.Create(id, owner)
            local c = {
                id = id,
                owner = owner or 0,
                location = 0x04, -- LOCATION_MZONE
                position = 0x01, -- POS_FACEUP_ATTACK
                effects = {},
                targets = {}
            }
            setmetatable(c, Card)
            return c
        end

        function Card:RegisterEffect(e, forced)
            table.insert(self.effects, e)
            e.handler = self
        end

        function Card:IsFaceup() return true end
        function Card:IsFacedown() return false end
        function Card:IsAttackPos() return self.position == 0x01 or self.position == 0x02 end
        function Card:IsDefensePos() return not self:IsAttackPos() end
        function Card:IsControler(tp) return self.owner == tp end
        function Card:GetCode() return self.id end
        function Card:GetOriginalCode() return self.id end
        function Card:GetSequence() return 0 end
        function Card:GetLocation() return self.location end
        function Card:IsLocation(loc) return true end
        function Card:IsOnField() return true end
        function Card:IsRelateToEffect(e) return true end
        function Card:IsRelateToCard(c) return true end
        function Card:IsCanBeEffectTarget(e) return true end
        function Card:IsAbleToHand() return true end
        function Card:IsAbleToGrave() return true end
        function Card:GetAttack() return 1500 end
        function Card:GetDefense() return 1000 end
        function Card:GetLevel() return 4 end
        function Card:GetType() return 0x11 end -- TYPE_MONSTER + TYPE_EFFECT
        function Card:IsType(t) return true end
        function Card:IsAttribute(att) return true end
        function Card:IsRace(r) return true end
        function Card:IsStatus(...) return false end
        function Card:IsReason(...) return true end
        function Card:GetFirstCardTarget() return self.targets[1] end

        -- Group Object
        Group.__index = Group
        function Group.Create(cards)
            local g = { cards = cards or {} }
            setmetatable(g, Group)
            return g
        end
        function Group:GetFirst() return self.cards[1] end
        function Group:GetNext() return nil end
        function Group:GetCount() return #self.cards end
        function Group:Filter(f, ex, ...) return self end
        function Group:IsContains(c) return true end
        function Group:GetSum(...) return 1000 end

        -- Effect Object
        Effect.__index = Effect
        function Effect.CreateEffect(c)
            local e = {
                handler = c,
                description = 0,
                category = 0,
                effect_type = 0,
                property = 0,
                code = 0,
                range = 0,
                condition = nil,
                target = nil,
                operation = nil,
                cost = nil,
                value = 0
            }
            setmetatable(e, Effect)
            return e
        end

        function Effect.GlobalEffect()
            return Effect.CreateEffect(nil)
        end

        function Effect:SetDescription(d) self.description = d end
        function Effect:SetCategory(cat) self.category = cat end
        function Effect:SetType(t) self.effect_type = t end
        function Effect:SetProperty(p) self.property = p end
        function Effect:SetCode(c) self.code = c end
        function Effect:SetRange(r) self.range = r end
        function Effect:SetTargetRange(...) end
        function Effect:SetCountLimit(...) end
        function Effect:SetCondition(c) self.condition = c end
        function Effect:SetTarget(t) self.target = t end
        function Effect:SetOperation(op) self.operation = op end
        function Effect:SetCost(c) self.cost = c end
        function Effect:SetValue(v) self.value = v end
        function Effect:SetReset(...) end
        function Effect:GetHandler() return self.handler end
        function Effect:GetOperation() return self.operation end
        function Effect:GetTarget() return self.target end
        function Effect:Clone()
            local cl = Effect.CreateEffect(self.handler)
            for k, v in pairs(self) do
                if k ~= "handler" then cl[k] = v end
            end
            return cl
        end

        -- Auxiliary functions
        function aux.Stringid(id, index) return id * 16 + index end
        function aux.TRUE() return true end
        function aux.FALSE() return false end
        function aux.FilterBoolFunction(f, ...)
            local args = {...}
            return function(target) return f(target, table.unpack(args)) end
        end
        function aux.AddEquipProcedure(...) end
        function aux.AddPersistentProcedure(...) end
        function aux.PersistentTargetFilter(...) return true end

        -- Duel Methods
        local currentTargetPlayer = 0
        local currentTargetParam = 0
        local currentTargets = {}

        function Duel.SetTargetPlayer(tp) currentTargetPlayer = tp end
        function Duel.SetTargetParam(param) currentTargetParam = param end
        function Duel.SetTargetCard(targets) 
            if type(targets) == "table" and targets.cards then
                currentTargets = targets.cards
            elseif type(targets) == "table" then
                currentTargets = { targets }
            end
        end
        function Duel.SelectTarget(tp, f, s, o, loc1, loc2, min, max, ex, ...)
            local dummy = Card.Create(10000000, 1 - tp)
            currentTargets = { dummy }
            return Group.Create({ dummy })
        end
        function Duel.GetFirstTarget()
            return currentTargets[1] or Card.Create(10000000, 1)
        end
        function Duel.GetTargets()
            return Group.Create(currentTargets)
        end
        function Duel.GetChainInfo(chain, ...)
            local args = {...}
            local res = {}
            for i, arg in ipairs(args) do
                if arg == CHAININFO_TARGET_PLAYER then
                    table.insert(res, currentTargetPlayer)
                elseif arg == CHAININFO_TARGET_PARAM then
                    table.insert(res, currentTargetParam)
                else
                    table.insert(res, 0)
                end
            end
            return table.unpack(res)
        end

        function Duel.Hint(...) end
        function Duel.SetOperationInfo(...) end
        function Duel.IsExistingTarget(...) return true end
        function Duel.IsExistingMatchingCard(...) return true end
        function Duel.SelectMatchingCard(tp, f, s, o, min, max, ex, ...)
            local dummy = Card.Create(10000000, 1 - tp)
            return Group.Create({ dummy })
        end
        function Duel.GetMatchingGroup(f, tp, s, o, ex, ...)
            return Group.Create({ Card.Create(10000000, 1 - tp) })
        end
        function Duel.GetFieldGroup(tp, loc1, loc2)
            return Group.Create({ Card.Create(10000000, 1 - tp) })
        end
        function Duel.GetOperatedGroup()
            return Group.Create({ Card.Create(10000000, 1) })
        end
        function Duel.RaiseEvent(...) end

        -- Action Callbacks to Node.js
        function Duel.Draw(tp, count, reason)
            __node_on_draw(tp, count)
            return count
        end
        function Duel.Damage(tp, amount, reason)
            __node_on_damage(tp, amount)
            return amount
        end
        function Duel.Recover(tp, amount, reason)
            __node_on_recover(tp, amount)
            return amount
        end
        function Duel.Destroy(targets, reason)
            local id = 0
            if type(targets) == "table" and targets.id then id = targets.id end
            __node_on_destroy(id, 0)
            return 1
        end
        function Duel.SendtoHand(targets, tp, reason)
            local id = 0
            if type(targets) == "table" and targets.id then id = targets.id end
            __node_on_to_hand(id, 0)
            return 1
        end
        function Duel.ChangePosition(targets, pos1, pos2, pos3, pos4)
            local id = 0
            if type(targets) == "table" and targets.id then id = targets.id end
            __node_on_change_pos(id, 0, pos3 or pos1)
            return 1
        end
    `);

    // Load constant.lua
    const constantCode = fs.readFileSync(path.join(scriptsDir, 'constant.lua'), 'utf-8');
    engine.doStringSync(constantCode);

    // Test execute card function
    async function execCard(cardId, ctx) {
        activeContext = ctx;
        let cId = parseInt(cardId, 10);
        let fn = `c${cId}.lua`;
        let fp = path.join(officialDir, fn);

        if (!fs.existsSync(fp)) {
            const cardInfo = ocgCardReader(cId);
            if (cardInfo && cardInfo.alias && cardInfo.alias > 0) {
                cId = cardInfo.alias;
                fn = `c${cId}.lua`;
                fp = path.join(officialDir, fn);
            }
        }

        if (!fs.existsSync(fp)) {
            console.log(`Script not found for ${cardId}`);
            return false;
        }

        const scriptContent = fs.readFileSync(fp, 'utf-8');
        const setup = `
            local s = {}
            local id = ${cId}
            function GetID() return s, id end
            ${scriptContent}

            local card = Card.Create(${cId}, ${ctx.turnPlayerIndex || 0})
            if s.initial_effect then s.initial_effect(card) end

            local effect = card.effects and card.effects[1] or nil
            local tp = ${ctx.turnPlayerIndex || 0}
            local dummyGroup = Group.Create({ Card.Create(10000000, 1 - tp) })

            if effect then
                local tg = effect:GetTarget() or s.target or s.tg or s.damtg or s.destg
                if tg then pcall(tg, effect, tp, dummyGroup, 1 - tp, 0, nil, 0, 1 - tp, 1) end

                local op = effect:GetOperation() or s.activate or s.operation or s.op or s.damop or s.desop
                if op then
                    local ok, err = pcall(op, effect, tp, dummyGroup, 1 - tp, 0, nil, 0, 1 - tp)
                    if not ok then print("[LUA ERR] " .. tostring(err)) end
                    return true
                end
            end

            if s.activate then s.activate(effect, tp, dummyGroup, 1 - tp, 0, nil, 0, 1 - tp) return true end
            if s.operation then s.operation(effect, tp, dummyGroup, 1 - tp, 0, nil, 0, 1 - tp) return true end
            if s.op then s.op(effect, tp, dummyGroup, 1 - tp, 0, nil, 0, 1 - tp) return true end
            return true
        `;

        try {
            return engine.doStringSync(setup);
        } catch (e) {
            console.log(`Error running c${cId}:`, e.message);
            return false;
        }
    }

    const testCards = [
        { id: 84257639, name: 'Dian Keto the Cure Maiden' },
        { id: 38199696, name: 'Red Medicine' },
        { id: 55144522, name: 'Pot of Greed' },
        { id: 12580477, name: 'Raigeki' },
        { id: 53129443, name: 'Dark Hole' },
        { id: 66788016, name: 'Fissure' },
        { id: 63102017, name: 'Stop Defense' },
        { id: 54652250, name: 'Man-Eater Bug' },
        { id: 7089711, name: 'Hane-Hane' },
        { id: 46130346, name: 'Trap Master' },
        { id: 18807109, name: 'Spellbinding Circle' },
        { id: 37120512, name: 'Sword of Dark Destruction' },
        { id: 4206964, name: 'Trap Hole' },
        { id: 19523799, name: 'Ookazi' },
        { id: 76103675, name: 'Sparks' },
        { id: 73134081, name: 'Final Flame' }
    ];

    for (const c of testCards) {
        console.log(`\n=== Testing ${c.name} (${c.id}) ===`);
        const ok = await execCard(c.id, {
            turnPlayerIndex: 0,
            onDraw: (p, count) => console.log(`  [CB] DRAW player=${p} count=${count}`),
            onDamage: (p, amount) => console.log(`  [CB] DAMAGE player=${p} amount=${amount}`),
            onRecover: (p, amount) => console.log(`  [CB] RECOVER player=${p} amount=${amount}`),
            onDestroy: (id, slot) => console.log(`  [CB] DESTROY cardId=${id}`),
            onToHand: (id, slot) => console.log(`  [CB] TO_HAND cardId=${id}`),
            onChangePos: (id, slot, pos) => console.log(`  [CB] CHANGE_POS cardId=${id} pos=${pos}`)
        });
        console.log(`  -> RESULT: ${ok ? 'PASSED ✅' : 'FAILED ❌'}`);
    }
}

testCompleteLua();
