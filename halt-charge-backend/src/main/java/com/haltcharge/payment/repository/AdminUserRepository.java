package com.haltcharge.payment.repository;

import com.haltcharge.payment.model.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {
    Optional<AdminUser> findByUsernameAndActiveTrue(String username);
}
