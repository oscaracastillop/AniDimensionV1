/**
 * ANI-DIMENSION: GESTIÓN DE AVATARES Y POTENCIADORES DE DUELISTA
 * CATÁLOGO COMPLETO DE 350 AVATARES (AVA-001 HASTA AVA-350)
 * INCLUYE LOS 170 NUEVOS AVATARES ADICIONADOS EN LA CARPETA AVATARS
 */
(function(window) {
    const STORAGE_KEY_AVATARS = 'ad_avatars_data_v6'; // Versión 6 con 'NUEVO' y nombres limpios sin circulo
    const STORAGE_KEY_USER_AVATARS = 'ad_user_avatars_v1';
    const STORAGE_KEY_ACTIVE_AVATAR = 'ad_active_avatar_v1';

    // Generar catálogo inicial de los 350 avatares (AVA-001 a AVA-350)
    function generateInitialAvatars() {
        const avatars = [];

        // AVA-001: Avatar Admin Especial (USO EXCLUSIVO DEL ADMIN - NO A LA VENTA)
        avatars.push({
            code: 'AVA-001',
            name: 'AVA-001',
            image: '../../../assets/images/avatars/AVA-001.png',
            exp_boost: 5.0,
            starships_boost: 5.0,
            luck_boost: 3.0,
            price: 0,
            offer_text: 'ADMIN',
            active: true
        });

        // AVA-002: Avatar Default Inicial (SIN POTENCIADORES: 0.0% - PRECIO 0)
        avatars.push({
            code: 'AVA-002',
            name: 'AVA-002',
            image: '../../../assets/images/avatars/AVA-002.png',
            exp_boost: 0.0,
            starships_boost: 0.0,
            luck_boost: 0.0,
            price: 0,
            offer_text: 'INICIAL',
            active: true
        });

        // AVA-003 hasta AVA-180: Avatares Estándar (PRECIO 50,000 STARSHIPS)
        for (let i = 3; i <= 180; i++) {
            const codeStr = 'AVA-' + String(i).padStart(3, '0');

            avatars.push({
                code: codeStr,
                name: codeStr,
                image: `../../../assets/images/avatars/${codeStr}.png`,
                exp_boost: 3.0,
                starships_boost: 2.0,
                luck_boost: 1.0,
                price: 50000,
                offer_text: 'NUEVO',
                active: true
            });
        }

        // AVA-181 hasta AVA-350: Avatares Adicionados por el usuario
        for (let i = 181; i <= 350; i++) {
            const codeStr = 'AVA-' + String(i).padStart(3, '0');

            avatars.push({
                code: codeStr,
                name: codeStr,
                image: `../../../assets/images/avatars/${codeStr}.png`,
                exp_boost: 3.0,
                starships_boost: 2.0,
                luck_boost: 1.0,
                price: 50000,
                offer_text: 'NUEVO',
                active: true
            });
        }

        return avatars;
    }

    const AvatarsManager = {
        /**
         * Obtiene la lista completa de avatares desde localStorage o inicializa el catálogo
         */
        getAvatars: function() {
            const data = localStorage.getItem(STORAGE_KEY_AVATARS);
            if (!data) {
                const initial = generateInitialAvatars();
                localStorage.setItem(STORAGE_KEY_AVATARS, JSON.stringify(initial));
                return initial;
            }

            let parsed = JSON.parse(data);
            const initial = generateInitialAvatars();

            // Garantizar que todos los 350 avatares estén presentes en el array
            if (parsed.length < initial.length) {
                initial.forEach(initItem => {
                    const existing = parsed.find(a => a.code === initItem.code);
                    if (!existing) {
                        parsed.push(initItem);
                    }
                });
                localStorage.setItem(STORAGE_KEY_AVATARS, JSON.stringify(parsed));
            }

            return parsed;
        },

        /**
         * Guarda el array de avatares en localStorage
         */
        saveAvatars: function(avatars) {
            if (!Array.isArray(avatars)) return false;
            localStorage.setItem(STORAGE_KEY_AVATARS, JSON.stringify(avatars));
            return true;
        },

        /**
         * Obtiene un avatar específico por su código AVA-XXX
         */
        getAvatarByCode: function(code) {
            const list = this.getAvatars();
            return list.find(a => a.code === code) || null;
        },

        /**
         * Obtiene los códigos de avatares comprados/poseídos por el usuario
         */
        getUserAvatars: function() {
            const data = localStorage.getItem(STORAGE_KEY_USER_AVATARS);
            if (!data) {
                // AVA-002 (Default) poseído por defecto
                const initial = ['AVA-002'];
                localStorage.setItem(STORAGE_KEY_USER_AVATARS, JSON.stringify(initial));
                return initial;
            }
            try {
                const parsed = JSON.parse(data);
                if (!parsed.includes('AVA-002')) parsed.push('AVA-002');
                return parsed;
            } catch (e) {
                return ['AVA-002'];
            }
        },

        /**
         * Registra la compra de un avatar agregando su código a las pertenencias del usuario
         */
        addUserAvatar: function(code) {
            const owned = this.getUserAvatars();
            if (!owned.includes(code)) {
                owned.push(code);
                localStorage.setItem(STORAGE_KEY_USER_AVATARS, JSON.stringify(owned));
            }
        },

        /**
         * Compra de avatar (alias para shop)
         */
        buyAvatar: function(code) {
            this.addUserAvatar(code);
        },

        /**
         * Verifica si el usuario posee un avatar
         */
        isAvatarOwned: function(code) {
            const owned = this.getUserAvatars();
            return owned.includes(code);
        },

        /**
         * Obtiene solo los avatares activos para la tienda (EXCLUYE AVA-001 QUE ES EXCLUSIVO DE ADMIN)
         */
        getActiveAvatars: function() {
            return this.getAvatars().filter(a => a.active !== false && a.code !== 'AVA-001');
        },

        /**
         * Obtiene el código del avatar equipado/activo del usuario
         */
        getActiveAvatarCode: function() {
            const code = localStorage.getItem(STORAGE_KEY_ACTIVE_AVATAR);
            return code || 'AVA-002';
        },

        /**
         * Obtiene el objeto completo del avatar equipado del usuario
         */
        getActiveAvatar: function() {
            const code = this.getActiveAvatarCode();
            return this.getAvatarByCode(code) || this.getAvatarByCode('AVA-002');
        },

        /**
         * Establece el avatar activo del usuario (Solo 1 a la vez)
         */
        setActiveAvatar: function(code) {
            const owned = this.getUserAvatars();
            if (owned.includes(code)) {
                localStorage.setItem(STORAGE_KEY_ACTIVE_AVATAR, code);
                return true;
            }
            return false;
        }
    };

    window.AvatarsManager = AvatarsManager;
})(window);
