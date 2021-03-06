package com.example.domain;

import java.io.Serializable;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

import org.hibernate.annotations.GenericGenerator;

@Entity(name="iuser")
public class IUser  implements Serializable{

	private static final long serialVersionUID = 1L;
	@Id
	@GenericGenerator(name="kaugen" , strategy="increment")
	@GeneratedValue(generator="kaugen")
	int id;
	@Column(name="name")
	String name;
	@Column(name="avatar")
	String avatar;
	@Column(name="profession")
	String profession;
	
	public IUser() {
		super();
		// TODO Auto-generated constructor stub
	
	}
	public int getId() {
		return id;
	}
	public void setId(int id) {
		this.id = id;
	}
	public String getName() {
		return name;
	}
	public void setName(String name) {
		this.name = name;
	}
	public String getAvatar() {
		return avatar;
	}
	public void setAvatar(String avatar) {
		this.avatar = avatar;
	}
	public String getProfession() {
		return profession;
	}
	public void setProfession(String profession) {
		this.profession = profession;
	}
	public long getSchedulesCreated() {
		return schedulesCreated;
	}
	public void setSchedulesCreated(long schedulesCreated) {
		this.schedulesCreated = schedulesCreated;
	}
	@Column(name="schedulescreated")
	long schedulesCreated;
}
