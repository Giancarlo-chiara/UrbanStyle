# =====================================================================
# UrbanStyle - Creacion de la base de datos, esquema y datos de prueba
# =====================================================================
# Uso:  .\setup-db.ps1
# Te pedira la contrasena del usuario 'postgres' UNA vez (no se guarda).
# =====================================================================

$PSQL = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$CREATEDB = "C:\Program Files\PostgreSQL\18\bin\createdb.exe"
$RAIZ = $PSScriptRoot

if (-not (Test-Path $PSQL)) { Write-Host "No encuentro psql en $PSQL" -ForegroundColor Red; exit 1 }

$sec = Read-Host "Contrasena del usuario postgres" -AsSecureString
$env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))

# CRITICO: los .sql estan en UTF-8, pero psql en Windows toma client_encoding de
# la consola (WIN1252 en un Windows en espanol). Sin esto, psql lee los bytes
# UTF-8 como Latin-1 y los RE-codifica: "Unica" se guarda doble-codificada y toda
# la tienda muestra acentos y emojis rotos.
$env:PGCLIENTENCODING = "UTF8"

Write-Host "`n[1/4] Comprobando conexion..." -ForegroundColor Cyan
& $PSQL -U postgres -h 127.0.0.1 -c "SELECT version();" -t | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Contrasena incorrecta o PostgreSQL no responde." -ForegroundColor Red; $env:PGPASSWORD=""; exit 1 }
Write-Host "      conexion OK" -ForegroundColor Green

Write-Host "[2/4] Creando base de datos 'urbanstyle' (si no existe)..." -ForegroundColor Cyan
$existe = & $PSQL -U postgres -h 127.0.0.1 -t -A -c "SELECT 1 FROM pg_database WHERE datname='urbanstyle';"
if ($existe -match '1') {
    Write-Host "      ya existe. La recreo desde cero (se borran los datos actuales)." -ForegroundColor Yellow
    & $PSQL -U postgres -h 127.0.0.1 -c "DROP DATABASE urbanstyle;" | Out-Null
}
& $CREATEDB -U postgres -h 127.0.0.1 urbanstyle
if ($LASTEXITCODE -ne 0) { Write-Host "No se pudo crear la base." -ForegroundColor Red; $env:PGPASSWORD=""; exit 1 }
Write-Host "      creada" -ForegroundColor Green

Write-Host "[3/4] Aplicando esquema (migraciones)..." -ForegroundColor Cyan
& $PSQL -U postgres -h 127.0.0.1 -d urbanstyle -v ON_ERROR_STOP=1 -f "$RAIZ\database\migrations\001_init_schema.sql"
if ($LASTEXITCODE -ne 0) { Write-Host "Fallo la migracion." -ForegroundColor Red; $env:PGPASSWORD=""; exit 1 }
Write-Host "      esquema aplicado" -ForegroundColor Green

Write-Host "[4/4] Cargando datos de prueba (seed)..." -ForegroundColor Cyan
& $PSQL -U postgres -h 127.0.0.1 -d urbanstyle -v ON_ERROR_STOP=1 -f "$RAIZ\database\seeders\002_seed_data.sql"
if ($LASTEXITCODE -ne 0) { Write-Host "Fallo el seed." -ForegroundColor Red; $env:PGPASSWORD=""; exit 1 }
Write-Host "      datos cargados" -ForegroundColor Green

Write-Host "[5/6] Escribiendo backend\.env con tu contrasena..." -ForegroundColor Cyan
# El JWT_SECRET por defecto del codigo ('urbanstyle_dev_secret_change_me') es publico:
# cualquiera que lea el repositorio puede firmarse un token con role=admin.
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$jwt = [Convert]::ToBase64String($bytes)
$envPath = "$RAIZ\backend\.env"
@"
# ==== Base de datos PostgreSQL ====
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=urbanstyle
DB_USERNAME=postgres
DB_PASSWORD=$($env:PGPASSWORD)

# ==== JWT ====
# Generado aleatoriamente por setup-db.ps1
JWT_SECRET=$jwt

# ==== CORS ====
CORS_ALLOWED_ORIGIN=http://localhost:5173
"@ | Set-Content -Path $envPath -Encoding UTF8
Write-Host "      backend\.env listo (con JWT_SECRET aleatorio)" -ForegroundColor Green

Write-Host "[6/6] Comprobando que PHP puede conectarse..." -ForegroundColor Cyan
$php = (Get-Command php -ErrorAction SilentlyContinue).Source
if ($php) {
    $prueba = & $php -r "try { `$p = new PDO('pgsql:host=127.0.0.1;port=5432;dbname=urbanstyle', 'postgres', getenv('PGPASSWORD')); echo 'PDO OK - productos: ' . `$p->query('SELECT COUNT(*) FROM products')->fetchColumn(); } catch (Throwable `$e) { echo 'PDO FALLA: ' . `$e->getMessage(); }"
    Write-Host "      $prueba" -ForegroundColor Green
}

Write-Host "`n--- Resumen ---" -ForegroundColor Cyan
& $PSQL -U postgres -h 127.0.0.1 -d urbanstyle -c "SELECT 'categorias' t, COUNT(*) FROM categories UNION ALL SELECT 'marcas', COUNT(*) FROM brands UNION ALL SELECT 'productos', COUNT(*) FROM products UNION ALL SELECT 'variantes', COUNT(*) FROM product_variants UNION ALL SELECT 'imagenes', COUNT(*) FROM product_images UNION ALL SELECT 'usuarios', COUNT(*) FROM users UNION ALL SELECT 'promociones', COUNT(*) FROM promotions;"

Write-Host "`n--- Comprobacion de codificacion ---" -ForegroundColor Cyan
# 'Unica' correcta ocupa 6 bytes en UTF-8; si se cargo doble-codificada ocupa 8.
$bytes = & $PSQL -U postgres -h 127.0.0.1 -d urbanstyle -t -A -c "SELECT octet_length('Única'::text);"
$enBase = & $PSQL -U postgres -h 127.0.0.1 -d urbanstyle -t -A -c "SELECT DISTINCT octet_length(size) FROM product_variants WHERE size LIKE '%nica';"
if ("$enBase".Trim() -eq "6") {
    Write-Host "      OK - acentos y emojis guardados correctamente (UTF-8)" -ForegroundColor Green
} else {
    Write-Host "      AVISO - 'Unica' ocupa $enBase bytes (deberia ser 6). Codificacion incorrecta." -ForegroundColor Red
}

Write-Host "`nTodo listo. Arranca los dos servidores:" -ForegroundColor Yellow
Write-Host "  1) cd backend\public  ;  php -S localhost:8000" -ForegroundColor Gray
Write-Host "  2) cd ecommerce       ;  npm run dev" -ForegroundColor Gray
Write-Host "`nTienda:  http://localhost:5173" -ForegroundColor Yellow
Write-Host "Admin:   admin@urbanstyle.pe / Admin123!" -ForegroundColor Yellow
$env:PGPASSWORD = ""
