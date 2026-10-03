-- CreateTable
CREATE TABLE `Submission` (
    `id` VARCHAR(36) NOT NULL,
    `studentId` VARCHAR(36) NOT NULL,
    `kind` ENUM('PROPOSAL', 'QUALIFICATION') NOT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `formData` JSON NOT NULL,
    `submittedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectionReason` VARCHAR(2000) NULL,
    `reviewedBy` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Submission_kind_status_submittedAt_idx`(`kind`, `status`, `submittedAt`),
    UNIQUE INDEX `Submission_studentId_kind_key`(`studentId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubmissionDocument` (
    `id` VARCHAR(36) NOT NULL,
    `submissionId` VARCHAR(36) NOT NULL,
    `type` ENUM('PROPOSAL_FORM', 'PAYMENT_RECEIPT', 'PROPOSAL_DRAFT', 'TRANSCRIPT', 'QUALIFICATION_FORM', 'PUBLISHED_ARTICLE_DRAFT', 'SIGNATURE') NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `filePath` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SubmissionDocument_submissionId_type_key`(`submissionId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_reviewedBy_fkey` FOREIGN KEY (`reviewedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubmissionDocument` ADD CONSTRAINT `SubmissionDocument_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `Submission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
