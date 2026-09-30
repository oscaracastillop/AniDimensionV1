const { LuaFactory } = require('wasmoon');
const fs = require('fs');
const path = require('path');
const { ocgCardReader } = require('../backend/data/sql-card-reader');

async function testFix() {
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

    engine.global.set('__node_on_change_pos', (id, slot, pos) => {
        if (activeContext && activeContext.onChangePos) activeContext.onChangePos(id, slot, pos);
    });

    engine.global.set('__node_on_destroy', (id, slot) => {
        if (activeContext && activeContext.onDestroy) activeContext.onDestroy(id, slot);
    });

    engine.doStringSync(`
        Duel = {}
        Card = {}
        Effect = {}
        Group = {}
        aux = {}
        Auxiliary = aux
        Debug = { CardToStringWrapper = tostring }

        function Duel.LoadScript(name)
            local content = __node_read_script(name)
            if content ~= "" then
                local fn = load(content, name)
                if fn then return fn() end
            end
        end

        Card.__index = Card
        function Card.Create(id, owner, pos)
            local c = {
                id = id,
                owner = owner or 0,
                position = pos or 0x01,
                effects = {},
                targets = {}
            }
            setmetatable(c, Card)
            return c
        end

        function Card:RegisterEffect(e) table.insert(self.effects, e) end
        function Card:IsAttackPos() return self.position == 0x01 or self.position == 0x02 end
        function Card:IsDefensePos() return not self:IsAttackPos() end
        function Card:IsRelateToEffect(e) return true end
        function Card:IsRelateToCard(c) return true end
        function Card:IsFaceup() return self.position == 0x01 or self.position == 0x02 end
        function Card:IsLocation() return true end
        function Card:IsControler() return true end

        Group.__index = Group
        function Group.Create(cards) return setmetatable({ cards = cards or {} }, Group) end
        function Group:GetFirst() return self.cards[1] end
        function Group:GetNext() return nil end
        function Group:GetCount() return #self.cards end
        function Group:Filter() return self end
        function Group:IsContains() return true end

        Effect.__index = Effect
        function Effect.CreateEffect(c)
            local e = { handler = c, effect_type = 0, code = 0 }
            setmetatable(e, Effect)
            return e
        end
        function Effect.GlobalEffect() return Effect.CreateEffect(nil) end
        function Effect:SetDescription() end
        function Effect:SetCategory() end
        function Effect:SetType(t) self.effect_type = t end
        function Effect:SetProperty() end
        function Effect:SetCode(c) self.code = c end
        function Effect:SetRange() end
        function Effect:SetTargetRange() end
        function Effect:SetCountLimit() end
        function Effect:SetCondition(c) self.condition = c end
        function Effect:SetTarget(t) self.target = t end
        function Effect:SetOperation(op) self.operation = op end
        function Effect:SetCost() end
        function Effect:SetValue() end
        function Effect:SetReset() end
        function Effect:GetHandler() return self.handler end
        function Effect:GetOperation() return self.operation end
        function Effect:GetTarget() return self.target end
        function Effect:Clone()
            local cl = Effect.CreateEffect(self.handler)
            for k, v in pairs(self) do if k ~= "handler" then cl[k] = v end end
            return cl
        end

        function aux.Stringid(id, idx) return id * 16 + idx end
        function aux.TRUE() return true end
        function aux.FilterBoolFunction() return function() return true end end
        function aux.AddEquipProcedure(c, ...)
            local e = Effect.CreateEffect(c)
            e:SetType(0x01) -- EFFECT_TYPE_ACTIVATE
            c:RegisterEffect(e)
            return e
        end
        function aux.AddPersistentProcedure(c, ...)
            local e = Effect.CreateEffect(c)
            e:SetType(0x01)
            c:RegisterEffect(e)
            return e
        end

        local currentTargets = {}
        function Duel.SetTargetCard(g) end
        function Duel.SelectTarget(tp, f, s, o, l1, l2, min, max, ex)
            return Group.Create(currentTargets)
        end
        function Duel.GetFirstTarget() return currentTargets[1] end
        function Duel.SetOperationInfo() end
        function Duel.Hint() end
        function Duel.IsExistingTarget() return true end

        function Duel.ChangePosition(targets, p1, p2, p3, p4)
            __node_on_change_pos(0, 0, p3 or p1)
            return 1
        end

        function Duel.Destroy(targets, reason)
            local id = 0
            if type(targets) == "table" and targets.id then id = targets.id end
            __node_on_destroy(id, 0)
            return 1
        end

        function Duel.SetCurrentTarget(card)
            currentTargets = { card }
        end
    `);

    // Load constant.lua
    const constantCode = fs.readFileSync(path.join(scriptsDir, 'constant.lua'), 'utf-8');
    engine.doStringSync(constantCode);

    // Test Stop Defense (63102017) with DEF target
    console.log('Testing Stop Defense with DEF target:');
    let posChanged = false;
    activeContext = {
        onChangePos: (id, slot, pos) => {
            console.log('  -> Callback onChangePos triggered! pos:', pos);
            posChanged = true;
        }
    };

    const c63102017 = fs.readFileSync(path.join(officialDir, 'c63102017.lua'), 'utf-8');
    engine.doStringSync(`
        local s = {}
        local id = 63102017
        function GetID() return s, id end
        ${c63102017}

        local card = Card.Create(63102017, 0)
        s.initial_effect(card)

        -- Target is in DEF position (0x04)
        local defMonster = Card.Create(89631139, 1, 0x04)
        Duel.SetCurrentTarget(defMonster)

        local eff = card.effects[1]
        if eff and eff:GetOperation() then
            eff:GetOperation()(eff, 0, nil, 0, 0, nil, 0, 0)
        end
    `);

    console.log('Result for Stop Defense:', posChanged ? 'PASSED ✅' : 'FAILED ❌');
}

testFix();
