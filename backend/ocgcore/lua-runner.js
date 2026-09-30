/**
 * Ani-Dimension: Ejecutor Oficial de Scripts Lua para OCGcore (WebAssembly Lua 5.4)
 * Ejecuta los scripts oficiales de Konami (/scripts/official/c*.lua)
 * interactuando con los callbacks y estado del juego sin reglas manuales en JS.
 */

const { LuaFactory } = require('wasmoon');
const fs = require('fs');
const path = require('path');
const { ocgCardReader } = require('../data/sql-card-reader');

class OcgLuaRunner {
    constructor() {
        this.factory = new LuaFactory();
        this.engine = null;
        this.initialized = false;
        this.scriptsDir = path.resolve(__dirname, 'scripts');
        this.officialScriptsDir = path.resolve(__dirname, 'scripts', 'official');
        this.activeDuelContext = null;
    }

    async init() {
        if (this.initialized) return;

        console.log('[OCG LUA] Inicializando motor oficial WebAssembly Lua...');
        this.engine = await this.factory.createEngine();

        // 1. Inyectar lector de scripts para Duel.LoadScript
        this.engine.global.set('__node_read_script', (scriptName) => {
            const possiblePaths = [
                path.join(this.scriptsDir, scriptName),
                path.join(this.officialScriptsDir, scriptName),
                path.join(this.scriptsDir, `${scriptName}.lua`),
                path.join(this.officialScriptsDir, `${scriptName}.lua`)
            ];
            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    return fs.readFileSync(p, 'utf-8');
                }
            }
            return '';
        });

        // 2. Inyectar callbacks del motor a Node.js
        this.engine.global.set('__node_on_draw', (playerIdx, count) => {
            if (this.activeDuelContext && this.activeDuelContext.onDraw) {
                this.activeDuelContext.onDraw(playerIdx, count);
            }
        });

        this.engine.global.set('__node_on_damage', (playerIdx, amount) => {
            if (this.activeDuelContext && this.activeDuelContext.onDamage) {
                this.activeDuelContext.onDamage(playerIdx, amount);
            }
        });

        this.engine.global.set('__node_on_recover', (playerIdx, amount) => {
            if (this.activeDuelContext && this.activeDuelContext.onRecover) {
                this.activeDuelContext.onRecover(playerIdx, amount);
            }
        });

        this.engine.global.set('__node_on_destroy', (cardId, slotIdx, owner, location) => {
            if (this.activeDuelContext && this.activeDuelContext.onDestroy) {
                this.activeDuelContext.onDestroy(cardId, slotIdx, owner, location);
            }
        });

        this.engine.global.set('__node_on_to_hand', (cardId, slotIdx) => {
            if (this.activeDuelContext && this.activeDuelContext.onToHand) {
                this.activeDuelContext.onToHand(cardId, slotIdx);
            }
        });

        this.engine.global.set('__node_on_change_pos', (cardId, slotIdx, pos) => {
            if (this.activeDuelContext && this.activeDuelContext.onChangePos) {
                this.activeDuelContext.onChangePos(cardId, slotIdx, pos);
            }
        });

        this.engine.global.set('__node_on_coin', (playerIdx) => {
            if (this.activeDuelContext && this.activeDuelContext.onCoin) {
                return this.activeDuelContext.onCoin(playerIdx);
            }
            return Math.random() < 0.5;
        });

        this.engine.global.set('__node_on_special_summon', (targetCode, targetPlayer, pos) => {
            if (this.activeDuelContext && this.activeDuelContext.onSpecialSummon) {
                this.activeDuelContext.onSpecialSummon(targetCode, targetPlayer, pos);
            }
        });

        this.engine.global.set('__node_on_negate_attack', () => {
            if (this.activeDuelContext && this.activeDuelContext.onNegateAttack) {
                this.activeDuelContext.onNegateAttack();
            }
        });

        this.engine.global.set('__node_log', (msg) => {
            console.log(`[LUA ENGINE LOG] ${msg}`);
        });

        // 3. Definir la API oficial completa de Konami OCGcore (Duel, Card, Effect, Group, aux, Debug)
        this.engine.doStringSync(`
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

            -- Gestión de Scripts
            function Duel.LoadScript(name)
                local content = __node_read_script(name)
                if content ~= "" then
                    local fn, err = load(content, name)
                    if fn then return fn() end
                end
            end

            -- Creación de Objetos Carta Konami
            Card.__index = Card
            function Card.Create(id, owner, pos, race, attribute, cardType, atk, def)
                local c = {
                    id = id or 0,
                    owner = owner or 0,
                    location = 0x04, -- LOCATION_MZONE
                    position = pos or 0x01, -- POS_FACEUP_ATTACK
                    race = race or 0,
                    attribute = attribute or 0,
                    type = cardType or 0x11,
                    attack = atk or 0,
                    defense = def or 0,
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

            function Card:IsFaceup() return self.position == 0x01 or self.position == 0x02 end
            function Card:IsFacedown() return not self:IsFaceup() end
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
            function Card:IsAbleToRemove() return true end
            function Card:GetTurnCounter() return self.turnCounter or 0 end
            function Card:SetTurnCounter(c) self.turnCounter = c end
            function Card:IsHasType(t) return true end
            function Card:IsDestructable() return true end
            function Card:GetPreviousLocation() return 0x04 end
            function Card:GetPreviousPosition() return 0x01 end
            function Card:IsPreviousPosition(p) return true end
            function Card:IsPreviousLocation(l) return true end
            function Card:GetAttack() return self.attack or 0 end
            function Card:GetDefense() return self.defense or 0 end
            function Card:GetLevel() return 4 end
            function Card:GetType() return self.type or 0x11 end
            function Card:GetRace() return self.race or 0 end
            function Card:GetAttribute() return self.attribute or 0 end
            function Card:IsType(t) return (self.type and (self.type & t) ~= 0) or false end
            function Card:IsAttribute(att) return (self.attribute and (self.attribute & att) ~= 0) or false end
            function Card:IsRace(r) return (self.race and (self.race & r) ~= 0) or false end
            function Card:IsTrap() return (self.type and (self.type & 0x04) ~= 0) or (self.race == "Trap") end
            function Card:IsSpell() return (self.type and (self.type & 0x02) ~= 0) or (self.race == "Spell") end
            function Card:IsMonster() return (self.type and (self.type & 0x01) ~= 0) or (self.race ~= "Spell" and self.race ~= "Trap") end
            function Card:IsStatus(...) return false end
            function Card:IsReason(...) return true end
            function Card:GetFirstCardTarget() return self.targets[1] end
            function Card:IsCanBeSpecialSummoned(...) return true end
            function Card:IsCanChangePosition() return true end

            -- Creación de Objetos Grupo Konami
            Group.__index = Group
            Group.__len = function(self) return #self.cards end
            function Group.Create(cards)
                local copy = {}
                if cards then
                    for i, c in ipairs(cards) do copy[i] = c end
                end
                local g = { cards = copy, index = 1 }
                setmetatable(g, Group)
                return g
            end
            function Group:GetFirst() 
                self.index = 2
                return self.cards[1] 
            end
            function Group:GetNext() 
                local c = self.cards[self.index]
                if c then
                    self.index = self.index + 1
                    return c
                end
                return nil
            end
            function Group:GetCount() return #self.cards end
            function Group:Filter(f, ex, ...)
                local res = {}
                local args = {...}
                for _, c in ipairs(self.cards) do
                    if not ex or c ~= ex then
                        if not f or f(c, table.unpack(args)) then
                            table.insert(res, c)
                        end
                    end
                end
                return Group.Create(res)
            end
            function Group:GetMinGroup(f)
                if #self.cards == 0 then return Group.Create({}) end
                local minVal = math.huge
                for _, c in ipairs(self.cards) do
                    local val = (f and f(c)) or 0
                    if val < minVal then minVal = val end
                end
                local res = {}
                for _, c in ipairs(self.cards) do
                    local val = (f and f(c)) or 0
                    if val == minVal then table.insert(res, c) end
                end
                return Group.Create(res)
            end
            function Group:GetMaxGroup(f)
                if #self.cards == 0 then return Group.Create({}) end
                local maxVal = -math.huge
                for _, c in ipairs(self.cards) do
                    local val = (f and f(c)) or 0
                    if val > maxVal then maxVal = val end
                end
                local res = {}
                for _, c in ipairs(self.cards) do
                    local val = (f and f(c)) or 0
                    if val == maxVal then table.insert(res, c) end
                end
                return Group.Create(res)
            end
            function Group:Select(tp, min, max, ex) return self end
            function Group:Merge(g)
                if g and g.cards and g ~= self then
                    local existing = {}
                    for _, c in ipairs(self.cards) do existing[c] = true end
                    for _, c in ipairs(g.cards) do
                        if not existing[c] then
                            table.insert(self.cards, c)
                            existing[c] = true
                        end
                    end
                end
                return self
            end
            function Group:IsContains(c) return true end
            function Group:GetSum(...) return 1000 end

            -- Definición de Efectos Konami
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
            function Effect:GetValue() return self.value end
            function Effect:GetCode() return self.code end
            function Effect:GetType() return self.effect_type end
            function Effect:GetRange() return self.range end
            function Effect:Clone()
                local cl = Effect.CreateEffect(self.handler)
                for k, v in pairs(self) do
                    if k ~= "handler" then cl[k] = v end
                end
                return cl
            end

            -- Funciones Auxiliares OCG
            function aux.Stringid(id, index) return id * 16 + index end
            function aux.TRUE() return true end
            function aux.FALSE() return false end
            function aux.FilterBoolFunction(f, ...)
                local args = {...}
                return function(target) return f(target, table.unpack(args)) end
            end
            function aux.TargetBoolFunction(f, ...)
                local args = {...}
                return function(e, c) return f(c, table.unpack(args)) end
            end
            function aux.AddEquipProcedure(c, p, f, eqlimit, cost, tg, op, con, prop)
                local e1 = Effect.CreateEffect(c)
                e1:SetCategory(CATEGORY_EQUIP)
                e1:SetType(EFFECT_TYPE_ACTIVATE)
                e1:SetCode(EVENT_FREE_CHAIN)
                e1.equip_filter = f
                c:RegisterEffect(e1)

                local e2 = Effect.CreateEffect(c)
                e2:SetType(EFFECT_TYPE_SINGLE)
                e2:SetCode(EFFECT_EQUIP_LIMIT)
                e2.equip_filter = f
                if eqlimit ~= nil then
                    e2:SetValue(eqlimit)
                else
                    e2:SetValue(function(e, tc)
                        return not f or f(tc)
                    end)
                end
                c:RegisterEffect(e2)
                c.equip_filter = f
                return e1
            end
            function aux.AddPersistentProcedure(c, ...)
                local e = Effect.CreateEffect(c)
                e:SetType(0x01) -- EFFECT_TYPE_ACTIVATE
                e:SetCode(EVENT_FREE_CHAIN)
                c:RegisterEffect(e)
                return e
            end
            function aux.Next(g)
                local first = true
                return function()
                    if first then
                        first = false
                        return g:GetFirst()
                    else
                        return g:GetNext()
                    end
                end
            end
            function aux.SpElimFilter(c) return true end
            Fusion = { RegisterSummonEff = function(c, ...) end }

            -- Métodos del Duelo Konami
            local currentTargetPlayer = 0
            local currentTargetParam = 0
            local currentTargets = {}
            Duel.fieldCards = {}

            function Duel.SetFieldCards(cards)
                Duel.fieldCards = cards or {}
            end

            function Duel.IsPlayerCanDraw(tp, count) return true end
            function Duel.SetTargetPlayer(tp) currentTargetPlayer = tp end
            function Duel.SetTargetParam(param) currentTargetParam = param end
            function Duel.SetTargetCard(targets) 
                if type(targets) == "table" and targets.cards then
                    currentTargets = targets.cards
                elseif type(targets) == "table" then
                    currentTargets = { targets }
                end
            end
            function Duel.SetCurrentTarget(card)
                currentTargets = { card }
            end
            function Duel.GetFirstTarget()
                return currentTargets[1] or Card.Create(10000000, 1)
            end
            function Duel.GetTargets()
                return Group.Create(currentTargets)
            end
            function Duel.SetOperationInfo(chain, cat, targets, count, player, param) end
            function Duel.GetChainInfo(chain, ...)
                local args = {...}
                local res = {}
                for i, arg in ipairs(args) do
                    if arg == CHAININFO_TARGET_PLAYER then
                        table.insert(res, currentTargetPlayer)
                    elseif arg == CHAININFO_TARGET_PARAM then
                        table.insert(res, currentTargetParam)
                    elseif arg == CHAININFO_TARGET_CARDS then
                        table.insert(res, Group.Create(currentTargets))
                    else
                        table.insert(res, 0)
                    end
                end
                return table.unpack(res)
            end

            function Duel.Hint(...) end
            function Duel.HintSelection(g) end
            function Duel.IsTurnPlayer(tp) return true end
            function Duel.IsExistingTarget(...) return true end

            function Duel.GetMatchingGroup(f, tp, s, o, ex, ...)
                local res = {}
                local args = {...}
                for _, c in ipairs(Duel.fieldCards or {}) do
                    local matchPlayer = false
                    if s ~= 0 and c.owner == tp then matchPlayer = true end
                    if o ~= 0 and c.owner == (1 - tp) then matchPlayer = true end

                    if matchPlayer then
                        if not ex or c ~= ex then
                            if not f or f(c, table.unpack(args)) then
                                table.insert(res, c)
                            end
                        end
                    end
                end
                return Group.Create(res)
            end

            function Duel.GetFieldGroup(tp, s, o)
                return Duel.GetMatchingGroup(nil, tp, s, o, nil)
            end

            function Duel.IsExistingMatchingCard(f, tp, s, o, count, ex, ...)
                local g = Duel.GetMatchingGroup(f, tp, s, o, ex, ...)
                return #g >= count
            end

            function Duel.SelectMatchingCard(tp, f, s, o, min, max, ex, ...)
                local g = Duel.GetMatchingGroup(f, tp, s, o, ex, ...)
                return g
            end

            function Duel.SelectTarget(tp, f, s, o, loc1, loc2, min, max, ex, ...)
                if #currentTargets > 0 then
                    return Group.Create(currentTargets)
                end
                local g = Duel.GetMatchingGroup(f, tp, s, o, ex, ...)
                if #g > 0 then
                    currentTargets = { g:GetFirst() }
                    return Group.Create(currentTargets)
                end
                local dummy = Card.Create(10000000, 1 - tp)
                currentTargets = { dummy }
                return Group.Create({ dummy })
            end

            function Duel.GetOperatedGroup()
                return Group.Create(currentTargets)
            end
            function Duel.RaiseEvent(...) end

            -- Acciones que comunican al backend Node.js
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
                local list = {}
                if type(targets) == "table" and targets.cards then
                    list = targets.cards
                elseif type(targets) == "table" and (targets.id or targets.code) then
                    list = { targets }
                end
                for _, c in ipairs(list) do
                    __node_on_destroy(c.id or c.code or 0, c.sequence or 0, c.owner or 0, c.location or 0x04)
                end
                return #list
            end

            function Duel.Remove(targets, pos, reason)
                local list = {}
                if type(targets) == "table" and targets.cards then
                    list = targets.cards
                elseif type(targets) == "table" and (targets.id or targets.code) then
                    list = { targets }
                end
                for _, c in ipairs(list) do
                    __node_on_destroy(c.id or c.code or 0, c.sequence or 0, c.owner or 0, c.location or 0x04)
                end
                return #list
            end

            function Duel.SendtoGrave(targets, reason)
                return Duel.Destroy(targets, reason)
            end

            function Duel.SendtoHand(targets, tp, reason)
                local list = {}
                if type(targets) == "table" and targets.cards then
                    list = targets.cards
                elseif type(targets) == "table" and (targets.id or targets.code) then
                    list = { targets }
                end
                for _, c in ipairs(list) do
                    __node_on_to_hand(c.id or c.code or 0, c.sequence or 0)
                end
                return #list
            end

            function Duel.ChangePosition(targets, pos1, pos2, pos3, pos4)
                local list = {}
                if type(targets) == "table" and targets.cards then
                    list = targets.cards
                elseif type(targets) == "table" and (targets.id or targets.code) then
                    list = { targets }
                end
                for _, c in ipairs(list) do
                    __node_on_change_pos(c.id or c.code or 0, c.sequence or 0, pos3 or pos1 or 0x01)
                end
                return #list
            end
            function Duel.CallCoin(tp)
                return __node_on_coin(tp)
            end
            function Duel.SpecialSummon(targets, sumtype, sumplayer, target_player, nocheck, nolimit, pos)
                local c = nil
                if type(targets) == "table" and targets.cards and targets.cards[1] then
                    c = targets.cards[1]
                elseif type(targets) == "table" and (targets.code or targets.id) then
                    c = targets
                elseif currentTargets and currentTargets[1] then
                    c = currentTargets[1]
                end
                local cId = (c and (c.code or c.id)) or 0
                __node_on_special_summon(cId, target_player or sumplayer or 0, pos or 1)
                return 1
            end
            function Duel.GetLocationCount(tp, loc)
                return 5
            end
            function Duel.NegateAttack()
                __node_on_negate_attack()
                return true
            end
            function Duel.ConfirmCards(...) end
        `);

        // 4. Cargar constantes oficiales de Konami
        const constantPath = path.join(this.scriptsDir, 'constant.lua');
        if (fs.existsSync(constantPath)) {
            const constantCode = fs.readFileSync(constantPath, 'utf-8');
            this.engine.doStringSync(constantCode);
        }

        this.initialized = true;
        console.log('✅ [OCG LUA] Motor Lua OCG inicializado con API completa de Konami.');
    }

    /**
     * Carga y registra los efectos de un script oficial c<id>.lua (soporta resolución de alias oficial)
     */
    loadCardScriptSync(cardId, ownerPlayer = 0) {
        if (!this.engine) return false;
        let numericId = parseInt(cardId, 10);
        let fileName = `c${numericId}.lua`;
        let filePath = path.join(this.officialScriptsDir, fileName);

        if (!fs.existsSync(filePath)) {
            // Resolver alias oficial si existe en base de datos
            const cardInfo = ocgCardReader(numericId);
            if (cardInfo && cardInfo.alias && cardInfo.alias > 0) {
                numericId = cardInfo.alias;
                fileName = `c${numericId}.lua`;
                filePath = path.join(this.officialScriptsDir, fileName);
            }
        }

        if (!fs.existsSync(filePath)) {
            // Buscar en carpeta scripts raíz
            filePath = path.join(this.scriptsDir, fileName);
        }

        if (!fs.existsSync(filePath)) {
            return false;
        }

        const scriptContent = fs.readFileSync(filePath, 'utf-8');
        const setupCode = `
            local s = {}
            local id = ${numericId}
            function GetID() return s, id end
            ${scriptContent}

            -- Crear carta y registrar su efecto oficial
            local card = Card.Create(${numericId}, ${ownerPlayer})
            if s.initial_effect then
                s.initial_effect(card)
            end

            _G["loaded_card_" .. ${cardId}] = {
                module = s,
                card = card
            }
            return true
        `;

        try {
            return this.engine.doStringSync(setupCode);
        } catch (err) {
            console.warn(`[OCG LUA] Error al ejecutar script c${numericId}.lua: ${err.message}`);
            return false;
        }
    }

    async loadCardScript(cardId, ownerPlayer = 0) {
        await this.init();
        return this.loadCardScriptSync(cardId, ownerPlayer);
    }

    /**
     * Ejecuta el efecto activado oficial de la carta pasando el contexto del duelo
     */
    async executeActivatedEffect(cardId, duelContext) {
        this.activeDuelContext = duelContext;
        const loaded = await this.loadCardScript(cardId, duelContext.turnPlayerIndex || 0);

        if (!loaded) {
            return false;
        }

        const numericId = parseInt(cardId, 10);
        const tp = duelContext.turnPlayerIndex || 0;
        const targetPos = duelContext.targetPosition === 'DEF' ? '0x04' : '0x01';
        const targetCardId = duelContext.targetCardId || 10000000;

        let targetType = 0x11;
        let targetLocation = 0x04;
        if (targetCardId && targetCardId !== 10000000) {
            const dbInfo = ocgCardReader(targetCardId);
            if (dbInfo && dbInfo.typeCode) {
                targetType = dbInfo.typeCode;
                if ((targetType & 0x02) !== 0 || (targetType & 0x04) !== 0) {
                    targetLocation = 0x08; // LOCATION_SZONE
                }
            }
        }
        if (numericId === 9076207 || numericId === 51482758) {
            targetType = 0x02;
            targetLocation = 0x08;
        } else if (numericId === 33066139) {
            targetType = 0x04;
            targetLocation = 0x08;
        }
        // Sincronizar el campo real en Lua si se suministró
        if (duelContext.fieldCards && Array.isArray(duelContext.fieldCards)) {
            this.syncFieldCards(duelContext.fieldCards);
        }

        try {
            const hasTargetSlot = duelContext.targetSlot !== undefined && duelContext.targetSlot >= 0;
            const targetOwner = duelContext.targetPlayer === 'player1' ? 0 : 1;

            const execCode = `
                local record = _G["loaded_card_" .. ${cardId}]
                if not record then return false end
                local s = record.module
                local card = record.card

                -- Configurar objetivo activo en el duelo
                local targetMonster = nil
                local hasSlot = ${hasTargetSlot ? 'true' : 'false'}
                local tOwner = ${targetOwner}
                local tSlot = ${duelContext.targetSlot || 0}

                if hasSlot then
                    for _, c in ipairs(Duel.fieldCards or {}) do
                        if c.owner == tOwner and c.sequence == tSlot then
                            targetMonster = c
                            break
                        end
                    end
                end

                if not targetMonster then
                    targetMonster = Card.Create(${targetCardId}, 1 - ${tp}, ${targetPos}, 0, 0, ${targetType})
                    targetMonster.location = ${targetLocation}
                    targetMonster.sequence = tSlot
                end

                Duel.SetTargetCard({ cards = { targetMonster } })
                Duel.SetCurrentTarget(targetMonster)

                local targetGroup = Group.Create({ targetMonster })

                -- Encontrar efecto de activación en los efectos registrados
                local actEffect = nil
                if card.effects then
                    for _, eff in ipairs(card.effects) do
                        if (eff.effect_type & 0x01) ~= 0 or eff:GetOperation() or eff:GetTarget() then
                            actEffect = eff
                            break
                        end
                    end
                end

                if actEffect then
                    local tg = actEffect:GetTarget() or s.target or s.tg or s.damtg or s.destg
                    if tg then
                        pcall(tg, actEffect, ${tp}, targetGroup, 1 - ${tp}, 0, nil, 0, 1 - ${tp}, 1)
                    end

                    local op = actEffect:GetOperation() or s.activate or s.operation or s.op or s.damop
                    if op then
                        local ok, err = pcall(op, actEffect, ${tp}, targetGroup, 1 - ${tp}, 0, nil, 0, 1 - ${tp})
                        if not ok then
                            print("[OCG LUA ERROR] " .. tostring(err))
                        end
                        return true
                    end
                end

                if s.activate then
                    s.activate(actEffect, ${tp}, targetGroup, 1 - ${tp}, 0, nil, 0, 1 - ${tp})
                    return true
                elseif s.operation then
                    s.operation(actEffect, ${tp}, targetGroup, 1 - ${tp}, 0, nil, 0, 1 - ${tp})
                    return true
                elseif s.op then
                    s.op(actEffect, ${tp}, targetGroup, 1 - ${tp}, 0, nil, 0, 1 - ${tp})
                    return true
                elseif s.damop then
                    s.damop(actEffect, ${tp}, targetGroup, 1 - ${tp}, 0, nil, 0, 1 - ${tp})
                    return true
                end

                return true
            `;

            return this.engine.doStringSync(execCode);
        } catch (err) {
            console.warn(`[OCG LUA] Error al resolver efecto en Lua de c${cardId}: ${err.message}`);
            return false;
        }
    }

    /**
     * Sincroniza las cartas reales del campo con el motor Lua
     */
    syncFieldCards(fieldCardsList) {
        if (!this.engine || !Array.isArray(fieldCardsList)) return;
        let luaCards = [];
        for (const c of fieldCardsList) {
            const id = c.id || c.card_id || 0;
            const owner = c.owner || 0;
            const pos = c.position || 0x01;
            const race = c.race || 0;
            const attr = c.attribute || 0;
            const type = c.type || 0x11;
            const atk = c.attack || 0;
            const def = c.defense || 0;
            const seq = c.sequence !== undefined ? c.sequence : 0;
            const loc = c.location || 0x04;
            luaCards.push(`(function() local card = Card.Create(${id}, ${owner}, ${pos}, ${race}, ${attr}, ${type}, ${atk}, ${def}); card.sequence = ${seq}; card.location = ${loc}; return card end)()`);
        }
        const syncCode = `Duel.SetFieldCards({ ${luaCards.join(', ')} })`;
        try {
            this.engine.doStringSync(syncCode);
        } catch (e) {
            console.warn('[OCG LUA] Error sincronizando cartas de campo:', e.message);
        }
    }

    /**
     * Valida si un monstruo cumple los requisitos oficiales en Lua para equiparse esta carta
     */
    checkCanEquip(equipCardId, monsterCardData) {
        if (!this.engine || !monsterCardData) return { valid: true };
        this.loadCardScriptSync(equipCardId);

        let raceCode = monsterCardData.raceCode;
        let attrCode = monsterCardData.attributeCode;
        let typeCode = monsterCardData.typeCode;
        const mId = monsterCardData.id || monsterCardData.card_id || 0;

        if ((!raceCode || !attrCode) && mId) {
            const dbInfo = ocgCardReader(mId);
            if (dbInfo) {
                if (!raceCode) raceCode = dbInfo.raceCode;
                if (!attrCode) attrCode = dbInfo.attributeCode;
                if (!typeCode) typeCode = dbInfo.typeCode;
            }
        }

        raceCode = raceCode || 0;
        attrCode = attrCode || 0;
        typeCode = typeCode || 0x11;
        const baseAtk = monsterCardData.atk || 0;
        const baseDef = monsterCardData.def || 0;

        const checkCode = `
            local mCard = Card.Create(${mId}, 0, 0x01, ${raceCode}, ${attrCode}, ${typeCode}, ${baseAtk}, ${baseDef})
            local rec = _G["loaded_card_" .. ${equipCardId}]
            if not rec or not rec.card then return true end

            if rec.card.equip_filter then
                local ok, res = pcall(rec.card.equip_filter, mCard)
                if ok then return res == true or res == 1 end
            end

            if rec.card.effects then
                for _, eff in ipairs(rec.card.effects) do
                    if eff:GetCode() == EFFECT_EQUIP_LIMIT then
                        local val = eff:GetValue()
                        if type(val) == "function" then
                            local ok, res = pcall(val, eff, mCard)
                            if ok then return res == true or res == 1 end
                        end
                    end
                end
            end

            return true
        `;

        try {
            const can = this.engine.doStringSync(checkCode);
            return { valid: can === true || can === 1 };
        } catch (e) {
            console.warn(`[OCG LUA] Error al validar equip con Lua de c${equipCardId}:`, e.message);
            return { valid: true };
        }
    }

    /**
     * Extrae los modificadores exactos de ATK y DEF que la carta de equipo otorga según su script oficial
     */
    getEquipStatMods(equipCardId, monsterCardData) {
        if (!this.engine) return { atkDelta: 0, defDelta: 0 };
        this.loadCardScriptSync(equipCardId);

        let raceCode = monsterCardData ? monsterCardData.raceCode : 0;
        let attrCode = monsterCardData ? monsterCardData.attributeCode : 0;
        let typeCode = monsterCardData ? monsterCardData.typeCode : 0x11;
        const mId = monsterCardData ? (monsterCardData.id || monsterCardData.card_id || 0) : 0;

        if ((!raceCode || !attrCode) && mId) {
            const dbInfo = ocgCardReader(mId);
            if (dbInfo) {
                if (!raceCode) raceCode = dbInfo.raceCode;
                if (!attrCode) attrCode = dbInfo.attributeCode;
                if (!typeCode) typeCode = dbInfo.typeCode;
            }
        }

        raceCode = raceCode || 0;
        attrCode = attrCode || 0;
        typeCode = typeCode || 0x11;
        const baseAtk = monsterCardData ? (monsterCardData.atk || 0) : 0;
        const baseDef = monsterCardData ? (monsterCardData.def || 0) : 0;

        const calcCode = `
            local mCard = Card.Create(${mId}, 0, 0x01, ${raceCode}, ${attrCode}, ${typeCode}, ${baseAtk}, ${baseDef})
            local rec = _G["loaded_card_" .. ${equipCardId}]
            local atkDelta = 0
            local defDelta = 0

            if rec and rec.card and rec.card.effects then
                for _, eff in ipairs(rec.card.effects) do
                    local t = eff:GetType()
                    if (t & 0x0002) ~= 0 or t == EFFECT_TYPE_EQUIP then
                        local code = eff:GetCode()
                        local val = eff:GetValue()
                        if type(val) == "function" then
                            local ok, vres = pcall(val, eff, mCard)
                            if ok then val = vres end
                        end
                        val = tonumber(val) or 0
                        if code == EFFECT_UPDATE_ATTACK then
                            atkDelta = atkDelta + val
                        elseif code == EFFECT_UPDATE_DEFENSE then
                            defDelta = defDelta + val
                        end
                    end
                end
            end

            return { atkDelta, defDelta }
        `;

        try {
            const res = this.engine.doStringSync(calcCode);
            return {
                atkDelta: (res && res[0] !== undefined) ? Number(res[0]) : 0,
                defDelta: (res && res[1] !== undefined) ? Number(res[1]) : 0
            };
        } catch (e) {
            console.warn(`[OCG LUA] Error al calcular stat mods de equipo c${equipCardId}:`, e.message);
            return { atkDelta: 0, defDelta: 0 };
        }

    }

    async calculateFieldStatMods(monster, activeFieldCardIds = []) {
        if (!monster || !activeFieldCardIds || activeFieldCardIds.length === 0) {
            return { atkMod: 0, defMod: 0 };
        }
        await this.init();

        const cardData = monster.card_data || monster;
        const raceCode = cardData.raceCode || 0;
        const attrCode = cardData.attributeCode || 0;
        const typeCode = cardData.typeCode || 0x11;
        const baseAtk = cardData.atk || 0;
        const baseDef = cardData.def || 0;
        const cardId = cardData.id || cardData.card_id || 0;

        for (const fId of activeFieldCardIds) {
            await this.loadCardScript(fId);
        }

        const luaScript = `
            local mCard = Card.Create(${cardId}, 0, 0x01, ${raceCode}, ${attrCode}, ${typeCode}, ${baseAtk}, ${baseDef})
            local fieldIds = { ${activeFieldCardIds.join(', ')} }
            local totalAtk = 0
            local totalDef = 0

            for _, fId in ipairs(fieldIds) do
                local rec = _G["loaded_card_" .. fId]
                if rec and rec.card and rec.card.effects then
                    for _, eff in ipairs(rec.card.effects) do
                        local code = eff:GetCode()
                        local applies = true
                        if eff.target then
                            local ok, res = pcall(eff.target, eff, mCard)
                            applies = ok and (res == true or res == 1)
                        end
                        if applies then
                            local val = eff:GetValue()
                            if type(val) == "function" then
                                local ok, vres = pcall(val, eff, mCard)
                                if ok then val = vres end
                            end
                            val = tonumber(val) or 0
                            if code == EFFECT_UPDATE_ATTACK then
                                totalAtk = totalAtk + val
                            elseif code == EFFECT_UPDATE_DEFENSE then
                                totalDef = totalDef + val
                            end
                        end
                    end
                end
            end

            return { totalAtk, totalDef }
        `;

        try {
            const res = this.engine.doStringSync(luaScript);
            return {
                atkMod: (res && res[0] !== undefined) ? Number(res[0]) : 0,
                defMod: (res && res[1] !== undefined) ? Number(res[1]) : 0
            };
        } catch (e) {
            console.warn('[OCG LUA] Error al calcular modificadores continuos de campo en Lua:', e.message);
            return { atkMod: 0, defMod: 0 };
        }
    }

    calculateFieldStatModsSync(monster, activeFieldCardIds = []) {
        if (!monster || !activeFieldCardIds || activeFieldCardIds.length === 0 || !this.engine) {
            return { atkMod: 0, defMod: 0 };
        }

        const cardData = monster.card_data || monster;
        const cardId = cardData.id || cardData.card_id || 0;
        let raceCode = cardData.raceCode;
        let attrCode = cardData.attributeCode;
        let typeCode = cardData.typeCode;

        if ((!raceCode || !attrCode) && cardId) {
            const dbInfo = ocgCardReader(cardId);
            if (dbInfo) {
                if (!raceCode) raceCode = dbInfo.raceCode;
                if (!attrCode) attrCode = dbInfo.attributeCode;
                if (!typeCode) typeCode = dbInfo.typeCode;
            }
        }

        raceCode = raceCode || 0;
        attrCode = attrCode || 0;
        typeCode = typeCode || 0x11;
        const baseAtk = cardData.atk || 0;
        const baseDef = cardData.def || 0;

        for (const fId of activeFieldCardIds) {
            this.loadCardScriptSync(fId);
        }

        const luaScript = `
            local mCard = Card.Create(${cardId}, 0, 0x01, ${raceCode}, ${attrCode}, ${typeCode}, ${baseAtk}, ${baseDef})
            local fieldIds = { ${activeFieldCardIds.join(', ')} }
            local totalAtk = 0
            local totalDef = 0

            for _, fId in ipairs(fieldIds) do
                local rec = _G["loaded_card_" .. fId]
                if rec and rec.card and rec.card.effects then
                    for _, eff in ipairs(rec.card.effects) do
                        local code = eff:GetCode()
                        local applies = true
                        if eff.target then
                            local ok, res = pcall(eff.target, eff, mCard)
                            applies = ok and (res == true or res == 1)
                        end
                        if applies then
                            local val = eff:GetValue()
                            if type(val) == "function" then
                                local ok, vres = pcall(val, eff, mCard)
                                if ok then val = vres end
                            end
                            val = tonumber(val) or 0
                            if code == EFFECT_UPDATE_ATTACK then
                                totalAtk = totalAtk + val
                            elseif code == EFFECT_UPDATE_DEFENSE then
                                totalDef = totalDef + val
                            end
                        end
                    end
                end
            end

            return { totalAtk, totalDef }
        `;

        try {
            const res = this.engine.doStringSync(luaScript);
            return {
                atkMod: (res && res[0] !== undefined) ? Number(res[0]) : 0,
                defMod: (res && res[1] !== undefined) ? Number(res[1]) : 0
            };
        } catch (e) {
            console.warn('[OCG LUA] Error al calcular modificadores continuos de campo en Lua:', e.message);
            return { atkMod: 0, defMod: 0 };
        }
    }
}

const ocgLuaRunner = new OcgLuaRunner();

module.exports = {
    OcgLuaRunner,
    ocgLuaRunner
};
