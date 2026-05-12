# ──────────────────────────────────────────────────────────
#  Stage 1 — Build
# ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Cache Maven dependencies first (layer stays cached unless pom.xml changes)
COPY pom.xml .
RUN apk add --no-cache maven && \
    mvn dependency:go-offline -B -q

# Copy sources and build
COPY src ./src
RUN mvn package -DskipTests -B -q

# ──────────────────────────────────────────────────────────
#  Stage 2 — Runtime
# ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime

# Security: non-root user
RUN addgroup -S aero && adduser -S aero -G aero

WORKDIR /app

# Copy the fat jar from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Upload directory (mounted as volume in compose)
RUN mkdir -p /app/uploads && chown -R aero:aero /app

USER aero

# JVM tuning: container-aware heap, virtual threads (Java 21)
ENV JAVA_OPTS="-XX:+UseContainerSupport \
               -XX:MaxRAMPercentage=75.0 \
               -Djava.security.egd=file:/dev/./urandom \
               -Dspring.threads.virtual.enabled=true"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
