@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ============================================================
echo   铁路危货双重预防机制智能安全管控平台 - 数据库一键初始化
echo ============================================================
echo.

rem ===== 数据库连接参数（如需修改，改这里即可） =====
set MYSQL_HOST=127.0.0.1
set MYSQL_PORT=3306
set MYSQL_USER=root
set MYSQL_PWD=123456

set MYSQL_EXE=
for %%P in (
  "D:\MySQL\MySQL Server 8.0\bin\mysql.exe"
  "D:\MySQL\MySQL Server 5.7\bin\mysql.exe"
  "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
  "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe"
  "C:\xampp\mysql\bin\mysql.exe"
  "C:\phpstudy_pro\Extensions\MySQL8.0.12\bin\mysql.exe"
) do (
  if exist %%P set MYSQL_EXE=%%~P
)

if "!MYSQL_EXE!"=="" (
  for /f "delims=" %%I in ('where mysql 2^>nul') do (
    if "!MYSQL_EXE!"=="" set MYSQL_EXE=%%I
  )
)

if "!MYSQL_EXE!"=="" (
  echo [未在常见位置找到 mysql.exe]
  echo 请把 mysql.exe 的完整路径粘贴到下面并回车，例如：
  echo   D:\MySQL\MySQL Server 8.0\bin\mysql.exe
  set /p MYSQL_EXE=路径：
)

if not exist "!MYSQL_EXE!" (
  echo.
  echo [失败] 找不到可执行文件：!MYSQL_EXE!
  echo 备选方案：用 Navicat / MySQL Workbench / DBeaver 打开同目录的 init_db.sql 整体执行
  echo 连接参数：主机 !MYSQL_HOST!  端口 !MYSQL_PORT!  账号 !MYSQL_USER!  密码 !MYSQL_PWD!
  if not "%~1"=="nopause" pause
  exit /b 1
)

echo MySQL 客户端：!MYSQL_EXE!
echo 执行脚本：%~dp0init_db.sql
echo 连接参数：!MYSQL_HOST!:!MYSQL_PORT!  账号 !MYSQL_USER!
echo.

rem 用临时配置文件传账号密码，避免命令行明文密码告警
set MYSQL_CNF=!TEMP!\rail_init_db_my.ini
> "!MYSQL_CNF!" echo [client]
>> "!MYSQL_CNF!" echo host=!MYSQL_HOST!
>> "!MYSQL_CNF!" echo port=!MYSQL_PORT!
>> "!MYSQL_CNF!" echo user=!MYSQL_USER!
>> "!MYSQL_CNF!" echo password=!MYSQL_PWD!
>> "!MYSQL_CNF!" echo default-character-set=utf8mb4

"!MYSQL_EXE!" --defaults-extra-file="!MYSQL_CNF!" < "%~dp0init_db.sql"
set MYSQL_RESULT=!errorlevel!
del "!MYSQL_CNF!" >nul 2>nul

if not "!MYSQL_RESULT!"=="0" (
  echo.
  echo [失败] 数据库初始化未成功，常见原因：
  echo   1^) MySQL 服务没有启动
  echo   2^) 账号或密码不是 !MYSQL_USER! / !MYSQL_PWD!
  echo   3^) 端口不是 !MYSQL_PORT!
  echo 处理办法：用记事本打开本文件，修改上面的 MYSQL_ 参数后重新双击；
  echo           或用数据库客户端手工执行 init_db.sql。
) else (
  echo.
  echo [成功] 数据库初始化完成
  echo   · 数据库：rail_safety（4 张表）
  echo   · 管理员账号：admin / admin123456
  echo 下一步启动后端：
  echo   cd backend
  echo   .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
)

echo.
if not "%~1"=="nopause" pause
