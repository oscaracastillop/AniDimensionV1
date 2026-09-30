const { LuaFactory } = require('wasmoon');
const fs = require('fs');
const path = require('path');

async function testLoading() {
    const factory = new LuaFactory();
    const engine = await factory.createEngine();

    const scriptsDir = path.resolve(__dirname, '../backend/ocgcore/scripts');
    const officialDir = path.resolve(__dirname, '../backend/ocgcore/scripts/official');

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

    // Basic stubs
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
                if fn then 
                    return fn() 
                else
                    print("[LOAD ERROR] " .. name .. ": " .. tostring(err))
                end
            end
        end
    `);

    // Load constant.lua
    const constantCode = fs.readFileSync(path.join(scriptsDir, 'constant.lua'), 'utf-8');
    engine.doStringSync(constantCode);
    console.log("constant.lua loaded successfully!");

    // Load utility.lua
    try {
        const utilCode = fs.readFileSync(path.join(scriptsDir, 'utility.lua'), 'utf-8');
        engine.doStringSync(utilCode);
        console.log("utility.lua loaded successfully!");
    } catch (e) {
        console.log("Error loading utility.lua:", e.message);
    }
}

testLoading();
