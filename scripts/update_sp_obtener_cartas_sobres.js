const { getPool } = require('../backend/config/db');

async function updateSp() {
    const pool = await getPool();
    console.log('[DB] Actualizando dbo.sp_ObtenerCartasDeSobres con soporte de textos en español...');

    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerCartasDeSobres
    @PackId NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        bpc.Id,
        bpc.PackId,
        bpc.CardId,
        bpc.CardNumber,
        bpc.CardName,
        ISNULL(t.name_es, bpc.CardName) AS CardNameEs,
        bpc.CardType,
        bpc.Atk,
        bpc.Def,
        bpc.[Level],
        bpc.Attribute,
        bpc.Race,
        bpc.Description,
        ISNULL(t.desc_es, bpc.Description) AS DescriptionEs,
        bpc.Rarity,
        bpc.IsActive,
        bpc.PackDrop,
        bpc.DeckUsable,
        bpc.NpcDrop,
        CONCAT('https://images.ygoprodeck.com/images/cards_small/', bpc.CardId, '.jpg') AS ImageUrl,
        CONCAT('https://images.ygoprodeck.com/images/cards/', bpc.CardId, '.jpg') AS ImageLargeUrl
    FROM dbo.BoosterPackCards bpc
    LEFT JOIN dbo.texts t ON bpc.CardId = t.id
    WHERE (@PackId IS NULL OR bpc.PackId = @PackId)
    ORDER BY bpc.PackId, bpc.Id ASC;
END;
    `);

    console.log('✅ Stored Procedure dbo.sp_ObtenerCartasDeSobres actualizado correctamente en SQL Server.');

    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerCatalogoSobresYCartas
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 1: Sobres
    SELECT 
        PackId, Name, Code, Series, Price, OfferText, Image, Description, CardsPerPack, IsActive, IsVisible
    FROM dbo.BoosterPacks
    ORDER BY 
        CASE Series 
            WHEN 'DM' THEN 1 
            WHEN 'GX' THEN 2 
            WHEN '5D' THEN 3 
            ELSE 4 
        END,
        Price ASC;

    -- Recordset 2: Cartas de los sobres
    SELECT 
        bpc.Id,
        bpc.PackId,
        bpc.CardId,
        bpc.CardNumber,
        bpc.CardName,
        ISNULL(t.name_es, bpc.CardName) AS CardNameEs,
        bpc.CardType,
        bpc.Atk,
        bpc.Def,
        bpc.[Level],
        bpc.Attribute,
        bpc.Race,
        bpc.Description,
        ISNULL(t.desc_es, bpc.Description) AS DescriptionEs,
        bpc.Rarity,
        bpc.IsActive,
        bpc.PackDrop,
        bpc.DeckUsable,
        bpc.NpcDrop,
        CONCAT('https://images.ygoprodeck.com/images/cards_small/', bpc.CardId, '.jpg') AS ImageUrl,
        CONCAT('https://images.ygoprodeck.com/images/cards/', bpc.CardId, '.jpg') AS ImageLargeUrl
    FROM dbo.BoosterPackCards bpc
    LEFT JOIN dbo.texts t ON bpc.CardId = t.id
    ORDER BY bpc.PackId, bpc.Id ASC;
END;
    `);
    console.log('✅ Stored Procedure dbo.sp_ObtenerCatalogoSobresYCartas actualizado correctamente en SQL Server.');
    process.exit(0);
}

updateSp().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
