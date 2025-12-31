-- Create transactions table for payment tracking
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='transactions' and xtype='U')
BEGIN
  CREATE TABLE transactions (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    duration_months INT NOT NULL,
    status NVARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, cancelled
    momo_order_id NVARCHAR(255),
    momo_request_id NVARCHAR(255),
    momo_trans_id NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_transactions_user FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX idx_transactions_user ON transactions(user_id);
  CREATE INDEX idx_transactions_momo_order ON transactions(momo_order_id);
  CREATE INDEX idx_transactions_status ON transactions(status);

  PRINT 'Transactions table created successfully';
END
ELSE
BEGIN
  PRINT 'Transactions table already exists';
END
GO
