/**
 * Sky Fall - Theme System
 * 
 * Centralized theme configuration for visual customization.
 * Each theme defines colors, visual styles, and future asset paths.
 */

// Theme type definition (for documentation)
/**
 * @typedef {Object} GameTheme
 * @property {string} id - Unique theme identifier
 * @property {string} name - Display name for the theme
 * @property {Object} colors - Color definitions
 * @property {string} colors.background - Main canvas background color
 * @property {string} colors.grass - Grass/ground color
 * @property {string} colors.grassDark - Darker grass accent color
 * @property {string} colors.obstacle - Primary obstacle color
 * @property {string} colors.obstacleBorder - Obstacle border color
 * @property {string} colors.coin - Primary coin color
 * @property {string} colors.coinBorder - Coin border color
 * @property {Object} colors.player - Player character colors
 * @property {string} colors.player.skin - Skin tone color
 * @property {string} colors.player.outline - Character outline color
 * @property {Object} ui - UI element colors (future expansion)
 * @property {string} ui.bodyGradientStart - Body background gradient start
 * @property {string} ui.bodyGradientEnd - Body background gradient end
 * @property {Object} assets - Asset paths (for future image-based themes)
 * @property {string} assets.backgroundImage - TODO: Background image path
 * @property {string} assets.obstacleSprite - TODO: Obstacle sprite path
 * @property {string} assets.playerSprite - TODO: Player sprite path
 * @property {string} assets.coinSprite - TODO: Coin sprite path
 */

/**
 * Available game themes
 * @type {Object.<string, GameTheme>}
 */
const GAME_THEMES = {
    // Default theme - bright daytime sky
    default: {
        id: 'default',
        name: 'Sky Blue',
        colors: {
            background: '#7dd3fc',      // Light sky blue
            grass: '#22c55e',           // Green grass
            grassDark: '#16a34a',       // Darker green accent
            obstacle: '#374151',        // Dark gray obstacles
            obstacleBorder: '#1f2937',  // Even darker border
            coin: '#fbbf24',            // Golden coin
            coinBorder: '#d97706',      // Darker gold border
            player: {
                skin: '#FFD1A4',        // Skin tone
                outline: '#000000'      // Black outline
            }
        },
        ui: {
            bodyGradientStart: '#60a5fa',
            bodyGradientEnd: '#2563eb'
        },
        assets: {
            backgroundImage: null,      // TODO: Add background image
            obstacleSprite: null,       // TODO: Add obstacle sprite
            playerSprite: null,         // TODO: Add player sprite
            coinSprite: null            // TODO: Add coin sprite
        }
    },

    // Campus Night theme - darker, campus-themed
    campusNight: {
        id: 'campusNight',
        name: 'Campus Night',
        colors: {
            background: '#1e3a8a',      // Dark navy blue (night sky)
            grass: '#15803d',           // Darker green (campus lawn)
            grassDark: '#14532d',       // Very dark green
            obstacle: '#991b1b',        // Deep red (brick buildings)
            obstacleBorder: '#7f1d1d',  // Darker red
            coin: '#eab308',            // Bright yellow (stadium lights)
            coinBorder: '#ca8a04',      // Dark yellow
            player: {
                skin: '#FFD1A4',        // Skin tone (same)
                outline: '#000000'      // Black outline
            }
        },
        ui: {
            bodyGradientStart: '#1e40af',
            bodyGradientEnd: '#1e3a8a'
        },
        assets: {
            backgroundImage: null,      // TODO: Add campus night background
            obstacleSprite: null,       // TODO: Add brick building sprites
            playerSprite: null,         // TODO: Add mascot sprite
            coinSprite: null            // TODO: Add trophy/medal sprite
        }
    },

    // Sunset theme - warm orange/pink sky
    sunset: {
        id: 'sunset',
        name: 'Golden Sunset',
        colors: {
            background: '#fb923c',      // Warm orange
            grass: '#84cc16',           // Lime green
            grassDark: '#65a30d',       // Darker lime
            obstacle: '#7c2d12',        // Deep brown/red
            obstacleBorder: '#431407',  // Very dark brown
            coin: '#fde047',            // Bright yellow
            coinBorder: '#facc15',      // Golden yellow
            player: {
                skin: '#FFD1A4',        // Skin tone (same)
                outline: '#000000'      // Black outline
            }
        },
        ui: {
            bodyGradientStart: '#fb923c',
            bodyGradientEnd: '#f97316'
        },
        assets: {
            backgroundImage: null,      // TODO: Add sunset background
            obstacleSprite: null,       // TODO: Add obstacle sprites
            playerSprite: null,         // TODO: Add player sprite
            coinSprite: null            // TODO: Add coin sprite
        }
    },

    // Rivalry theme - school colors (placeholder for future expansion)
    rivalry: {
        id: 'rivalry',
        name: 'Rivalry Colors',
        colors: {
            background: '#3b82f6',      // Blue
            grass: '#fbbf24',           // Gold
            grassDark: '#f59e0b',       // Darker gold
            obstacle: '#dc2626',        // Red (rival color)
            obstacleBorder: '#991b1b',  // Dark red
            coin: '#ffffff',            // White (neutral)
            coinBorder: '#e5e7eb',      // Light gray
            player: {
                skin: '#FFD1A4',        // Skin tone (same)
                outline: '#000000'      // Black outline
            }
        },
        ui: {
            bodyGradientStart: '#3b82f6',
            bodyGradientEnd: '#2563eb'
        },
        assets: {
            backgroundImage: null,      // TODO: Add rivalry background
            obstacleSprite: null,       // TODO: Add themed obstacles
            playerSprite: null,         // TODO: Add mascot sprite
            coinSprite: null            // TODO: Add trophy sprite
        }
    }
};

/**
 * Get a theme by ID
 * @param {string} themeId - Theme identifier
 * @returns {GameTheme} The requested theme, or default if not found
 */
function getTheme(themeId) {
    return GAME_THEMES[themeId] || GAME_THEMES.default;
}

/**
 * Get all available theme IDs
 * @returns {string[]} Array of theme IDs
 */
function getAvailableThemeIds() {
    return Object.keys(GAME_THEMES);
}

/**
 * Get all themes as an array
 * @returns {GameTheme[]} Array of all themes
 */
function getAllThemes() {
    return Object.values(GAME_THEMES);
}

/**
 * Load custom themes from localStorage and merge with stock themes
 * @returns {Object.<string, GameTheme>} All themes (stock + custom)
 */
function getAllThemesWithCustom() {
    const allThemes = { ...GAME_THEMES };
    
    // Load custom themes from localStorage
    try {
        const customThemesJSON = localStorage.getItem('customThemes');
        if (customThemesJSON) {
            const customThemes = JSON.parse(customThemesJSON);
            customThemes.forEach(theme => {
                allThemes[theme.id] = theme;
            });
            console.log(`✅ Loaded ${customThemes.length} custom themes`);
        }
    } catch (error) {
        console.error('Error loading custom themes:', error);
    }
    
    return allThemes;
}

/**
 * Get a theme by ID (including custom themes)
 * @param {string} themeId - Theme identifier
 * @returns {GameTheme} The requested theme, or default if not found
 */
function getThemeWithCustom(themeId) {
    const allThemes = getAllThemesWithCustom();
    return allThemes[themeId] || allThemes.default || GAME_THEMES.default;
}

// Export for use in the game
if (typeof window !== 'undefined') {
    window.GameThemes = {
        GAME_THEMES,
        getTheme,
        getThemeWithCustom,
        getAllThemesWithCustom,
        getAvailableThemeIds,
        getAllThemes
    };
}
