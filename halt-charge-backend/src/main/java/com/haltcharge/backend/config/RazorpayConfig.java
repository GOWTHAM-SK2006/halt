package com.haltcharge.backend.config;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RazorpayConfig {

    @Value("${app.razorpay.key-id}")
    private String keyId;

    @Value("${app.razorpay.key-secret}")
    private String keySecret;

    @Bean
    public RazorpayClient razorpayClient() throws RazorpayException {
        return new RazorpayClient(keyId, keySecret);
    }

    @Bean
    public String razorpayKeyId() {
        return keyId;
    }

    @Bean
    public String razorpayWebhookSecret(
        @Value("${app.razorpay.webhook-secret}") String webhookSecret
    ) {
        return webhookSecret;
    }
}
