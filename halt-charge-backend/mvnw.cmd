@REM Maven Wrapper Windows batch script
@REM Licensed to the Apache Software Foundation (ASF)

@IF "%__MVNW_ARG0_NAME__%"=="" (SET "BASE_DIR=%~dp0")

@SET WRAPPER_JAR="%BASE_DIR%.mvn\wrapper\maven-wrapper.jar"
@SET WRAPPER_PROPERTIES="%BASE_DIR%.mvn\wrapper\maven-wrapper.properties"

@JAVA_EXEC="java"
@IF NOT "%JAVA_HOME%"=="" @SET JAVA_EXEC="%JAVA_HOME%\bin\java"

@SET DOWNLOAD_URL=https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar

@IF NOT EXIST %WRAPPER_JAR% (
    @echo Downloading Maven Wrapper...
    @IF NOT "%MVNW_REPOURL%"=="" @SET DOWNLOAD_URL="%MVNW_REPOURL%/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar"
    @powershell -Command "(New-Object Net.WebClient).DownloadFile('%DOWNLOAD_URL%', %WRAPPER_JAR%)"
)

%JAVA_EXEC% %MAVEN_OPTS% ^
    -jar %WRAPPER_JAR% ^
    %*
