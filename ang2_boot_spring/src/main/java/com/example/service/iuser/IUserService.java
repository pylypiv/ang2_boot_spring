package com.example.service.iuser;

import java.util.List;

import com.example.domain.IUser;

public interface IUserService {
	public List<IUser> findAll();
	public IUser saveOrUpdate(IUser iuser);
	
	public void delete(int id);
}
