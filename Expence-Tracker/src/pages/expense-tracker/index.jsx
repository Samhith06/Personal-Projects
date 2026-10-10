import { useState } from "react";
import { signOut } from "firebase/auth";
import { useAddTransaction } from "../../hooks/useAddTransaction";
import { useGetTransactions } from "../../hooks/useGetTransactions";
import { useGetUserInfo } from "../../hooks/useGetUserInfo";
import { useNavigate } from "react-router-dom";

import { auth } from "../../config/firebase-config";
import "./style.css"

export const ExpenseTracker = () => {
  const { addTransaction } = useAddTransaction();
  const { transactions, transactionTotals } = useGetTransactions();
  const { name, profilePhoto } = useGetUserInfo();
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [transactionAmount, setTransactionAmount] = useState(0);
  const [transactionType, setTransactionType] = useState("expense");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("Food & Dining");

  const { balance, income, expenses } = transactionTotals;

  const onSubmit = (e) => {
    e.preventDefault();
    addTransaction({
      description,
      transactionAmount,
      transactionType,
      date,
      category,
    });

    setDescription("");
    setTransactionAmount("");
    setDate("");
    setCategory("Food & Dining");
  };

  const signUserOut = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      navigate("/");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="expense-tracker">
        <div className="header">
          <h1> <img className ="Rupee-image" src="../public/Svg/currency-rupee.svg"></img>Expense Tracker</h1>
          <div className="user-info">
            <span>Welcome, {name}</span>
            <button className="sign-out-button" onClick={signUserOut}>
              Sign Out
            </button>
          </div>
        </div>
        <p className="header p">Take control of your finances. Track your spending, categorize expenses, and monitor your financial habits.</p>
        
        <div className="cards">
          <div className="card income">
            <h3>Monthly Income</h3>
            <div className="amount">${income}</div>
            <div className="subtext">This month's income</div>
          </div>
          <div className="card spent">
            <h3>Month Spent</h3>
            <div className="amount">${expenses}</div>
            <div className="subtext">0 expenses this month</div>
          </div>
          <div className="card balance">
            <h3>Balance</h3>
            <div className="amount">{balance >= 0 ? `$${balance}` : `-$${balance * -1}`}</div>
            <div className="subtext">Available to spend</div>
          </div>
        </div>          
      <div className="main-add-transaction">
        <form className="add-transaction" onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="amount">Amount ($)</label>
            <input
              type="number"
              id="amount"
              placeholder="Amount"
              value={transactionAmount}
              required
              onChange={(e) => setTransactionAmount(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              value={date}
              required
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <input
              type="text"
              id="description"
              placeholder="Description"
              value={description}
              required
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Food & Dining">Food & Dining</option>
              <option value="Transportation">Transportation</option>
              <option value="Bills & Utilities">Bills & Utilities</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Monthly Salary">Monthly Salary</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="radio-group">
            <input
              type="radio"
              id="expense"
              value="expense"
              checked={transactionType === "expense"}
              onChange={(e) => setTransactionType(e.target.value)}
            />
            <label htmlFor="expense">Expense</label>
            <input
              type="radio"
              id="income"
              value="income"
              checked={transactionType === "income"}
              onChange={(e) => setTransactionType(e.target.value)}
            />
            <label htmlFor="income">Income</label>
          </div>
          <button type="submit">Add Transaction</button>
        </form>
        </div>
        {profilePhoto && (
          <div className="profile">
            <img className="profile-photo" src={profilePhoto} alt="Profile" />
          </div>
        )}
      </div>
      <div className="main-add-transaction">
      <div className="transactions">
        <h3>Transactions</h3>
        <ul>
          {transactions.map((transaction) => {
            const { description, transactionAmount, transactionType, date, category } = transaction;
            return (
              <li key={transaction.id}>
                <div className="details">
                  <h4>{description}</h4>
                  <p>{date} • {category}</p>
                </div>
                <p className="amount-label" style={{color : transactionType === "expense" ? "red" : "green"}}>
                  ${transactionAmount} •{" "}
                  <span
                    style={{
                      color: transactionType === "expense" ? "red" : "green",
                    }}
                  >
                    {transactionType}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      </div>
      </div>
    </>
  );
};