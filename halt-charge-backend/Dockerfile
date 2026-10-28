# ── Stage 1: Build ──────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

# Install Maven
RUN apk add --no-cache maven

WORKDIR /app

# Copy POM first for dependency caching
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copy source and build
COPY src ./src
RUN mvn clean package -DskipTests -q

# ── Stage 2: Run ─────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy only the fat JAR
COPY --from=builder /app/target/halt-charge-backend-1.0.0.jar app.jar

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE ${PORT:-8080}

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=70.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
